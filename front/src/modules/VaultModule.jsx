import { useState, useEffect } from 'react';
import { RefreshCw, Upload, Trash2, Plus, Database } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api, readFileAsBase64 } from '../api/client';
import GlassCard from '../components/GlassCard';
import GlowButton from '../components/GlowButton';
import './VaultModule.css';

function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString();
}

export default function VaultModule() {
  const {
    stores, selectedStore, setSelectedStore, documents, setDocuments,
    refreshState, refreshStores, refreshDocuments, state,
  } = useApp();

  const [storeSelectValue, setStoreSelectValue] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('Aún no hay cargas.');
  const [loadingAction, setLoadingAction] = useState('');

  useEffect(() => {
    if (selectedStore) {
      setStoreSelectValue(selectedStore);
    } else if (stores.length > 0) {
      setStoreSelectValue(stores[0].name);
    }
  }, [stores, selectedStore]);

  const doRefresh = async () => {
    setLoadingAction('refresh');
    try {
      await refreshStores();
      await refreshDocuments(storeSelectValue);
      await refreshState();
    } finally {
      setLoadingAction('');
    }
  };

  const doSelectStore = async () => {
    if (!storeSelectValue) return;
    setLoadingAction('select');
    try {
      await api('/store/select', { method: 'POST', body: JSON.stringify({ storeName: storeSelectValue }) });
      await refreshDocuments(storeSelectValue);
      await refreshState();
      await refreshStores();
    } finally {
      setLoadingAction('');
    }
  };

  const doCreateStore = async () => {
    setLoadingAction('create');
    try {
      await api('/store/create', { method: 'POST', body: JSON.stringify({ displayName: newStoreName.trim() }) });
      setNewStoreName('');
      await refreshState();
      await refreshStores();
      await refreshDocuments();
    } finally {
      setLoadingAction('');
    }
  };

  const doDeleteStore = async (storeName) => {
    if (!window.confirm(`¿Eliminar store?\n${storeName}`)) return;
    setLoadingAction('delete');
    try {
      await api('/store/delete', { method: 'POST', body: JSON.stringify({ storeName }) });
      await refreshState();
      await refreshStores();
      await refreshDocuments();
      setUploadStatus('Aún no hay cargas.');
    } finally {
      setLoadingAction('');
    }
  };

  const doUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadStatus(`Leyendo ${selectedFile.name}...`);
    try {
      const base64 = await readFileAsBase64(selectedFile);
      setUploadStatus('Subiendo e indexando en Gemini File Search...');
      const data = await api('/documents/upload', {
        method: 'POST',
        timeoutMs: 240000,
        body: JSON.stringify({
          fileName: selectedFile.name,
          mimeType: selectedFile.type || 'application/octet-stream',
          base64,
        }),
      });
      setUploadStatus(JSON.stringify({ ok: data.ok, message: data.message }, null, 2));
      setSelectedFile(null);
      await refreshState();
      await refreshStores();
      await refreshDocuments(storeSelectValue);
    } catch (err) {
      setUploadStatus(`Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const doDeleteDoc = async (docName, displayName) => {
    if (!window.confirm(`¿Eliminar documento?\n${displayName || docName}`)) return;
    try {
      await api('/document/delete', { method: 'POST', body: JSON.stringify({ documentName: docName }) });
      await refreshDocuments(storeSelectValue);
      await refreshStores();
      await refreshState();
    } catch {
      // silent
    }
  };

  const handleStoreSelectChange = async (e) => {
    const val = e.target.value;
    setStoreSelectValue(val);
    try {
      await refreshDocuments(val);
    } catch {
      // silent
    }
  };

  return (
    <div className="vault-module">
      {/* ═══════ Store Management ═══════ */}
      <GlassCard title="Selección de Storage" subtitle="Selecciona el store de contexto que usará Tactical Lex.">
        <div className="store-section">
          <div className="store-select-wrap">
            <label>Stores de Contexto Disponibles</label>
            <select className="vault-select" value={storeSelectValue} onChange={handleStoreSelectChange}>
              {stores.length === 0 ? (
                <option value="">(No se encontraron stores)</option>
              ) : (
                stores.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.displayName || 'store-sin-nombre'} | docs: {s.activeDocumentsCount ?? 0}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="store-actions">
            <GlowButton variant="ghost" size="small" onClick={doRefresh} loading={loadingAction === 'refresh'}>
              <RefreshCw size={14} /> Recargar
            </GlowButton>
            <GlowButton size="small" onClick={doSelectStore} loading={loadingAction === 'select'}>
              <Database size={14} /> Usar Store
            </GlowButton>
            <GlowButton variant="danger" size="small" onClick={() => doDeleteStore(storeSelectValue)} loading={loadingAction === 'delete'}>
              <Trash2 size={14} /> Eliminar
            </GlowButton>
          </div>

          <div className="vault-input-group">
            <label>Crear Nuevo Store</label>
            <input
              className="vault-input"
              type="text"
              placeholder="ej: legal-context-v1"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
            />
          </div>
          <div className="create-actions">
            <GlowButton size="small" onClick={doCreateStore} loading={loadingAction === 'create'}>
              <Plus size={14} /> Crear Store
            </GlowButton>
          </div>
        </div>
      </GlassCard>

      {/* ═══════ Upload ═══════ */}
      <GlassCard title="Carga de Documentos" subtitle="Sube archivos al store de contexto seleccionado.">
        <div className="upload-zone">
          <div className={`upload-dropzone ${selectedFile ? 'has-file' : ''}`}>
            <div className="upload-icon">
              <Upload size={24} />
            </div>
            {selectedFile ? (
              <p className="file-name">{selectedFile.name}</p>
            ) : (
              <p>Arrastra un archivo o haz clic para seleccionar</p>
            )}
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>.pdf, .txt, .md, .docx</p>
            <input
              type="file"
              accept=".pdf,.txt,.md,.docx"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
          </div>

          <GlowButton full onClick={doUpload} loading={uploading} disabled={!selectedFile}>
            <Upload size={16} /> Subir e Indexar
          </GlowButton>

          <div className="upload-status">{uploadStatus}</div>
        </div>
      </GlassCard>

      {/* ═══════ Documents List ═══════ */}
      <GlassCard title="Documentos del Store Activo" className="vault-full">
        <div className="docs-list">
          {documents.length === 0 ? (
            <div className="docs-empty">No hay documentos en el store activo.</div>
          ) : (
            documents.map((doc) => (
              <div key={doc.name} className="doc-row">
                <div className="doc-info">
                  <span className="doc-name">{doc.displayName || doc.name || '(sin nombre)'}</span>
                  <span className="doc-meta">
                    Estado: {doc.state || '-'} | Tamaño: {formatBytes(doc.sizeBytes)} | Actualizado: {formatDate(doc.updateTime)}
                  </span>
                  <span className="doc-resource">{doc.name}</span>
                </div>
                <GlowButton variant="danger" size="small" onClick={() => doDeleteDoc(doc.name, doc.displayName)}>
                  <Trash2 size={14} />
                </GlowButton>
              </div>
            ))
          )}
        </div>
      </GlassCard>

      {/* ═══════ State ═══════ */}
      <GlassCard title="Estado del Sistema" className="vault-full">
        <div className="state-box">{state ? JSON.stringify(state, null, 2) : 'Cargando estado...'}</div>
      </GlassCard>
    </div>
  );
}
