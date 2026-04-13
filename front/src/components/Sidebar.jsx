import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, FolderOpen, FileText, Settings, LogOut, Plus, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './Sidebar.css';

const navItems = [
  { to: '/app/chat', icon: MessageSquare, label: 'Chat Legal' },
  { to: '/app/documents', icon: FileText, label: 'Documentos' },
  { to: '/app/vault', icon: FolderOpen, label: 'Bóveda de Contexto' },
];

function truncateTitle(title, max = 28) {
  if (!title) return 'Nueva conversación';
  return title.length > max ? title.slice(0, max) + '...' : title;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ayer';
  return `Hace ${days}d`;
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { chatSessions, sessionId, createNewSession, activateSession } = useApp();

  const handleNewConversation = async () => {
    try {
      await createNewSession();
      navigate('/app/chat');
    } catch {
      // silent
    }
  };

  const handleSwitchSession = async (targetId) => {
    if (targetId === sessionId) {
      navigate('/app/chat');
      return;
    }
    try {
      await activateSession(targetId);
      navigate('/app/chat');
    } catch {
      // silent
    }
  };

  const isOnChat = location.pathname === '/app/chat';

  return (
    <aside className="sidebar">
      <div className="sidebar-header" onClick={() => navigate('/app/chat')} title="Tactical Lex">
        <div className="sidebar-logo">TL</div>
        <span className="sidebar-brand">Tactical Lex</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <item.icon size={18} />
            <span className="sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Conversation History */}
      <div className="sidebar-conversations">
        <div className="sidebar-section-title">Conversaciones</div>
        <button className="sidebar-new-chat" onClick={handleNewConversation}>
          <Plus size={14} />
          <span>Nueva conversación</span>
        </button>
        <div className="sidebar-sessions-list">
          {chatSessions.length === 0 ? (
            <div className="sidebar-no-sessions">Sin historial aún</div>
          ) : (
            chatSessions.map((s) => (
              <button
                key={s.sessionId}
                className={`sidebar-session-item ${s.sessionId === sessionId && isOnChat ? 'active' : ''}`}
                onClick={() => handleSwitchSession(s.sessionId)}
                title={s.title}
              >
                <MessageCircle size={14} className="session-icon" />
                <div className="session-info">
                  <span className="session-title">{truncateTitle(s.title)}</span>
                  <span className="session-meta">{formatDate(s.updatedAt)}{s.turnsCount > 0 ? ` · ${s.turnsCount} msgs` : ''}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-link" title="Configuración">
          <Settings size={18} />
          <span className="sidebar-label">Configuración</span>
        </div>
        <div className="sidebar-link" onClick={() => navigate('/')} title="Salir">
          <LogOut size={18} />
          <span className="sidebar-label">Salir</span>
        </div>
        <div className="sidebar-avatar" title="Usuario">U</div>
      </div>
    </aside>
  );
}
