import { NavLink, useNavigate } from 'react-router-dom';
import { MessageSquare, FolderOpen, FileText, Settings, LogOut } from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { to: '/app/chat', icon: MessageSquare, label: 'Chat Legal' },
  { to: '/app/documents', icon: FileText, label: 'Documentos' },
  { to: '/app/vault', icon: FolderOpen, label: 'Bóveda de Contexto' },
];

export default function Sidebar() {
  const navigate = useNavigate();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" onClick={() => navigate('/app/chat')} title="Tactical Lex">
        TL
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} />
            <span className="tooltip">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-link" title="Configuración">
          <Settings size={20} />
          <span className="tooltip">Configuración</span>
        </div>
        <div className="sidebar-link" onClick={() => navigate('/')} title="Salir">
          <LogOut size={20} />
          <span className="tooltip">Salir</span>
        </div>
        <div className="sidebar-avatar" title="Usuario">U</div>
      </div>
    </aside>
  );
}
