import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AppLayout from './pages/AppLayout';
import ChatModule from './modules/ChatModule';
import VaultModule from './modules/VaultModule';
import DocumentsModule from './modules/DocumentsModule';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* App (protected layout) */}
        <Route
          path="/app"
          element={
            <AppProvider>
              <AppLayout />
            </AppProvider>
          }
        >
          <Route index element={<Navigate to="/app/chat" replace />} />
          <Route path="chat" element={<ChatModule />} />
          <Route path="vault" element={<VaultModule />} />
          <Route path="documents" element={<DocumentsModule />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
