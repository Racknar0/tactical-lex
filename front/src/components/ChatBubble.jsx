import { CheckCircle } from 'lucide-react';
import './ChatBubble.css';

const MODE_LABELS = {
  estricto: 'Estricto',
  hibrido: 'Híbrido',
  libre: 'Libre',
};

export default function ChatBubble({ role, text, grounded, timestamp, responseMode, usedContext }) {
  const label = role === 'user' ? 'Tú' : 'Tactical Lex';
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString()
    : new Date().toLocaleTimeString();
  const modeLabel = responseMode ? (MODE_LABELS[responseMode] || responseMode) : '';

  return (
    <div className={`chat-bubble ${role}`}>
      <span className="bubble-meta">
        <span>{label} • {time}</span>
        {role === 'assistant' && modeLabel && (
          <span className={`bubble-mode-tag mode-${responseMode}`}>{modeLabel}</span>
        )}
        {role === 'assistant' && typeof usedContext === 'boolean' && (
          <span className={`bubble-context-tag ${usedContext ? 'yes' : 'no'}`}>
            {usedContext ? 'Con contexto' : 'Sin contexto'}
          </span>
        )}
      </span>
      <div className="bubble-body">{text}</div>
      {role === 'assistant' && typeof grounded === 'boolean' && (
        <span className={`bubble-grounded ${grounded ? 'yes' : 'no'}`}>
          {grounded && <CheckCircle size={12} />}
          {grounded ? 'Fundamentada' : 'Sin contexto'}
        </span>
      )}
    </div>
  );
}
