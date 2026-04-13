import { useMemo, useRef, useState } from 'react';
import html2pdf from 'html2pdf.js';
import { Download, FileCheck2 } from 'lucide-react';
import GlowButton from '../components/GlowButton';
import './VisorDocumentoLegal.css';

function splitParagraphs(text) {
  return String(text || '')
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDateLong(date) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export default function VisorTutelaLegal({ form, generatedData, selectedModel }) {
  const documentRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const issueDate = useMemo(() => formatDateLong(new Date()), []);
  const hechos = splitParagraphs(generatedData?.hechos_juridicos);
  const pretensiones = splitParagraphs(generatedData?.pretensiones_juridicas);
  const fundamentos = splitParagraphs(generatedData?.fundamentos_de_derecho);

  const handleDownloadPdf = async () => {
    if (!documentRef.current) return;

    setDownloadError('');
    setDownloading(true);

    try {
      const filenameBase = String(form.nombresApellidos || 'tutela')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      await html2pdf()
        .set({
          margin: [12, 12, 12, 12],
          filename: `accion-tutela-${filenameBase || 'documento'}.pdf`,
          image: { type: 'jpeg', quality: 0.97 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] },
        })
        .from(documentRef.current)
        .save();
    } catch (error) {
      setDownloadError(error.message || 'No se pudo descargar el PDF.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="legal-viewer-shell">
      <div className="legal-viewer-toolbar">
        <div>
          <h3>Borrador generado</h3>
          <p>
            Revisa el texto antes de firmar y radicar. Modelo usado: <strong>{selectedModel}</strong>
          </p>
        </div>

        <GlowButton type="button" onClick={handleDownloadPdf} loading={downloading}>
          <Download size={16} /> Descargar PDF
        </GlowButton>
      </div>

      {downloadError ? <p className="legal-viewer-error">{downloadError}</p> : null}

      <article className="legal-document" ref={documentRef}>
        <header className="legal-document-header">
          <p>Duitama, {issueDate}</p>
          <h2>ACCIÓN DE TUTELA</h2>
          <p>Artículo 86 de la Constitución Política y Decreto 2591 de 1991</p>
        </header>

        <section className="legal-document-block pdf-avoid-break">
          <p>
            <strong>Señor Juez de la República (Reparto)</strong>
          </p>
          <p>
            <strong>Referencia:</strong> Acción de tutela contra {form.entidadAccionada}
          </p>
        </section>

        <section className="legal-document-block pdf-avoid-break">
          <p>
            Yo, <strong>{form.nombresApellidos}</strong>, identificado(a) con
            <strong> {form.tipoDocumento}</strong> No. <strong>{form.numeroDocumento}</strong>,
            actuando en nombre propio, interpongo ACCIÓN DE TUTELA en contra de
            <strong> {form.entidadAccionada}</strong> por la vulneración del derecho fundamental a
            <strong> {form.derechoVulnerado}</strong>.
          </p>
        </section>

        <section className="legal-document-block">
          <h4>I. HECHOS</h4>
          {hechos.map((paragraph, index) => (
            <p key={`hecho-tutela-${index}`}>{paragraph}</p>
          ))}
        </section>

        <section className="legal-document-block pdf-avoid-break">
          <h4>II. DERECHO FUNDAMENTAL VULNERADO</h4>
          <p>{form.derechoVulnerado}</p>
        </section>

        <section className="legal-document-block">
          <h4>III. PRETENSIONES</h4>
          {pretensiones.map((paragraph, index) => (
            <p key={`pretension-${index}`}>{paragraph}</p>
          ))}
        </section>

        <section className="legal-document-block">
          <h4>IV. FUNDAMENTOS DE DERECHO</h4>
          {fundamentos.map((paragraph, index) => (
            <p key={`fundamento-tutela-${index}`}>{paragraph}</p>
          ))}
        </section>

        <section className="legal-document-block pdf-avoid-break">
          <h4>V. PRUEBAS</h4>
          <p>{form.relacionPruebas || 'No se relacionan pruebas adicionales en esta acción.'}</p>
        </section>

        <section className="legal-document-block pdf-avoid-break">
          <h4>VI. JURAMENTO</h4>
          <p>
            Bajo la gravedad del juramento manifiesto que no he presentado ninguna otra acción de tutela por los mismos hechos y derechos ante ningún otro juez.
          </p>
        </section>

        <section className="legal-document-block pdf-avoid-break">
          <h4>VII. NOTIFICACIONES</h4>
          <p>
            Agradezco remitir las comunicaciones y decisiones a la dirección {form.direccionNotificacion}
            {form.correoElectronico ? ` y al correo electrónico ${form.correoElectronico}` : ''}.
          </p>
        </section>

        <footer className="legal-document-footer">
          <p>Atentamente,</p>
          <p className="legal-signature-space" />
          <p>
            <strong>{form.nombresApellidos}</strong>
          </p>
          <p>{form.tipoDocumento} No. {form.numeroDocumento}</p>
          <p className="legal-document-meta">
            <FileCheck2 size={14} /> Documento generado con Tactical Lex IA.
          </p>
        </footer>
      </article>
    </section>
  );
}
