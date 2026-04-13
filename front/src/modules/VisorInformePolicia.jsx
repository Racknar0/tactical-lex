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

function formatNovedadDateTime(value) {
  const input = String(value || '').trim();
  if (!input) return 'fecha y hora no informadas';

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return input;
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function VisorInformePolicia({ form, generatedData, selectedModel }) {
  const documentRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const fechaHoraTexto = useMemo(() => formatNovedadDateTime(form.fechaHora), [form.fechaHora]);
  const cuerpoInforme = splitParagraphs(generatedData?.cuerpo_informe);

  const handleDownloadPdf = async () => {
    if (!documentRef.current) return;

    setDownloadError('');
    setDownloading(true);

    try {
      const filenameBase = String(form.nombres || 'informe-policia')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      await html2pdf()
        .set({
          margin: [12, 12, 12, 12],
          filename: `informe-novedad-${filenameBase || 'documento'}.pdf`,
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
          <p><strong>MINISTERIO DE DEFENSA NACIONAL</strong></p>
          <p><strong>POLICÍA NACIONAL</strong></p>
        </header>

        <section className="legal-document-block pdf-avoid-break">
          <p><strong>ASUNTO:</strong> {generatedData?.asunto}</p>
          <p><strong>AL CONTESTAR CITE:</strong> Informe Novedad - {form.unidad}</p>
        </section>

        <section className="legal-document-block pdf-avoid-break">
          <p>
            Respetuosamente me dirijo a mi Mayor / Comandante de Estación, con el fin de informar la
            siguiente novedad ocurrida el día {fechaHoraTexto} en {form.lugar}:
          </p>
        </section>

        <section className="legal-document-block">
          {cuerpoInforme.map((paragraph, index) => (
            <p key={`informe-${index}`}>{paragraph}</p>
          ))}
        </section>

        <section className="legal-document-block pdf-avoid-break">
          <p>Es todo cuanto tengo que informar.</p>
        </section>

        <footer className="legal-document-footer">
          <p>Atentamente,</p>
          <p className="legal-signature-space" />
          <p>
            <strong>{form.grado} {form.nombres}</strong>
          </p>
          <p>{form.unidad}</p>
          <p className="legal-document-meta">
            <FileCheck2 size={14} /> Documento generado con Tactical Lex IA.
          </p>
        </footer>
      </article>
    </section>
  );
}
