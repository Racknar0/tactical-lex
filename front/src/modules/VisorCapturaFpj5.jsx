import { useRef, useState } from 'react';
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

export default function VisorCapturaFpj5({ form, generatedData, selectedModel }) {
  const documentRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const relato = splitParagraphs(generatedData?.relato_fpj5);

  const handleDownloadPdf = async () => {
    if (!documentRef.current) return;

    setDownloadError('');
    setDownloading(true);

    try {
      const filenameBase = String(form.capturadorGradoNombres || 'captura-fpj5')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      await html2pdf()
        .set({
          margin: [12, 12, 12, 12],
          filename: `captura-fpj5-${filenameBase || 'documento'}.pdf`,
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
            Revisa el texto antes de copiar al FPJ-5. Modelo usado: <strong>{selectedModel}</strong>
          </p>
        </div>

        <GlowButton type="button" onClick={handleDownloadPdf} loading={downloading}>
          <Download size={16} /> Descargar PDF
        </GlowButton>
      </div>

      {downloadError ? <p className="legal-viewer-error">{downloadError}</p> : null}

      <article className="legal-document" ref={documentRef}>
        <header className="legal-document-header">
          <p><strong>POLICÍA NACIONAL DE COLOMBIA</strong></p>
          <p><strong>POLICÍA JUDICIAL - FORMATO FPJ-5</strong></p>
          <p>Relato de Captura en Flagrancia</p>
        </header>

        <section className="legal-document-block pdf-avoid-break">
          <p><strong>Capturador:</strong> {form.capturadorGradoNombres}</p>
          <p><strong>Unidad / Cuadrante:</strong> {form.unidadCuadrante}</p>
          <p><strong>Indiciado:</strong> {form.indiciado}</p>
          <p><strong>Presunto delito:</strong> {form.presuntoDelito}</p>
          <p><strong>Lugar, fecha y hora:</strong> {form.lugarFechaHora}</p>
        </section>

        <section className="legal-document-block">
          <h4>RELATO TÉCNICO DE LOS HECHOS (FPJ-5)</h4>
          {relato.map((paragraph, index) => (
            <p key={`fpj5-${index}`}>{paragraph}</p>
          ))}
        </section>

        <footer className="legal-document-footer">
          <p>Es todo cuanto se informa para fines de judicialización.</p>
          <p className="legal-signature-space" />
          <p>
            <strong>{form.capturadorGradoNombres}</strong>
          </p>
          <p>{form.unidadCuadrante}</p>
          <p className="legal-document-meta">
            <FileCheck2 size={14} /> Documento generado con Tactical Lex IA.
          </p>
        </footer>
      </article>
    </section>
  );
}
