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

export default function VisorDocumentoLegal({ form, generatedData, selectedModel }) {
  const documentRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const issueDate = useMemo(() => formatDateLong(new Date()), []);
  const hechos = splitParagraphs(generatedData?.hechos_juridicos);
  const fundamentos = splitParagraphs(generatedData?.fundamentos_de_derecho);

  const handleDownloadPdf = async () => {
    if (!documentRef.current) return;

    setDownloadError('');
    setDownloading(true);

    try {
      const filenameBase = String(form.nombresApellidos || 'peticion')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      await html2pdf()
        .set({
          margin: [12, 12, 12, 12],
          filename: `derecho-peticion-${filenameBase || 'documento'}.pdf`,
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
          <h2>DERECHO DE PETICIÓN</h2>
          <p>Artículo 23 de la Constitución Política y Ley 1755 de 2015</p>
        </header>

        <section className="legal-document-block pdf-avoid-break">
          <p>
            <strong>Señores:</strong>
          </p>
          <p>{form.nombreEntidad}</p>
          <p>
            <strong>Asunto:</strong> Derecho de petición - {form.objetoPeticion}
          </p>
        </section>

        <section className="legal-document-block pdf-avoid-break">
          <p>
            Yo, <strong>{form.nombresApellidos}</strong>, identificado(a) con
            <strong> {form.tipoDocumento}</strong> No. <strong>{form.numeroDocumento}</strong>, en
            ejercicio del derecho fundamental de petición, presento la siguiente solicitud respetuosa:
          </p>
        </section>

        <section className="legal-document-block">
          <h4>I. HECHOS JURÍDICOS</h4>
          {hechos.map((paragraph, index) => (
            <p key={`hecho-${index}`}>{paragraph}</p>
          ))}
        </section>

        <section className="legal-document-block">
          <h4>II. FUNDAMENTOS DE DERECHO</h4>
          {fundamentos.map((paragraph, index) => (
            <p key={`fundamento-${index}`}>{paragraph}</p>
          ))}
        </section>

        <section className="legal-document-block pdf-avoid-break">
          <h4>III. PETICIÓN CONCRETA</h4>
          <ol>
            <li>{form.objetoPeticion}</li>
          </ol>
        </section>

        <section className="legal-document-block pdf-avoid-break">
          <h4>IV. PRUEBAS Y ANEXOS</h4>
          <p>{form.relacionDocumentos || 'No se relacionan anexos adicionales en esta solicitud.'}</p>
        </section>

        <section className="legal-document-block pdf-avoid-break">
          <h4>V. NOTIFICACIONES</h4>
          <p>
            Agradezco remitir la respuesta a la dirección {form.direccionNotificacion}
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
