import { FileText, Sparkles } from 'lucide-react';
import './DocumentsModule.css';

export default function DocumentsModule() {
  return (
    <div className="docs-module">
      <div className="docs-placeholder">
        <div className="docs-placeholder-icon">
          <FileText size={36} />
        </div>
        <h2>Generador de Documentos</h2>
        <p>
          Módulo reservado para futuros flujos de generación de documentos legales asistidos por inteligencia artificial.
        </p>
        <div className="docs-chip">
          <Sparkles size={16} />
          Próximamente
        </div>
      </div>
    </div>
  );
}
