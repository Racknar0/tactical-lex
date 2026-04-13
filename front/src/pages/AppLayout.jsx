import { Outlet, useLocation } from 'react-router-dom';
import { Database } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useApp } from '../context/AppContext';
import './AppLayout.css';

const routeTitles = {
  '/app/chat': { title: 'Chat Legal', subtitle: 'Núcleo de Recuperación Cognitiva' },
  '/app/vault': { title: 'Bóveda de Contexto', subtitle: 'Stores y Documentos' },
  '/app/documents': { title: 'Generador de Documentos', subtitle: 'Módulo en desarrollo' },
};

export default function AppLayout() {
  const location = useLocation();
  const { selectedStore, loading } = useApp();

  const route = routeTitles[location.pathname] || { title: 'Tactical Lex', subtitle: '' };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        Conectando con Tactical Lex...
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-left">
            <div>
              <div className="app-topbar-title">{route.title}</div>
              <div className="app-topbar-subtitle">{route.subtitle}</div>
            </div>
          </div>
          <div className="app-topbar-right">
            <div className={`store-chip ${selectedStore ? '' : 'none'}`}>
              <Database size={13} />
              {selectedStore
                ? selectedStore.split('/').pop()
                : 'Sin store activo'}
            </div>
          </div>
        </header>
        <div className="app-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
