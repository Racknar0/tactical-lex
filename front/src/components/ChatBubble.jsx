import { CheckCircle } from 'lucide-react';
import './ChatBubble.css';

export default function ChatBubble({ role, text, grounded, timestamp }) {
  const label = role === 'user' ? 'Tú' : 'Tactical Lex';
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString()
    : new Date().toLocaleTimeString();

  return (
    <div className={`chat-bubble ${role}`}>
      <span className="bubble-meta">{label} • {time}</span>
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
