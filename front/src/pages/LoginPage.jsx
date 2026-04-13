import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowLeft } from 'lucide-react';
import GlowButton from '../components/GlowButton';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate login delay (mockup - no real auth)
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    navigate('/app/chat');
  };

  return (
    <div className="login-page">
      <div className="login-orb o1" />
      <div className="login-orb o2" />

      <Link to="/" className="login-back">
        <ArrowLeft size={16} />
        Volver
      </Link>

      <div className="login-card">
        <div className="login-logo">
          <div className="logo-square">TL</div>
          <span>Tactical Lex</span>
        </div>
        <p className="login-subtitle">Inicia sesión para acceder a tu asistente legal inteligente</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label>Correo electrónico</label>
            <div className="input-wrap">
              <Mail size={18} />
              <input
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="login-field">
            <label>Contraseña</label>
            <div className="input-wrap">
              <Lock size={18} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="login-options">
            <label>
              <input type="checkbox" defaultChecked />
              Recordarme
            </label>
            <a href="#">¿Olvidaste tu contraseña?</a>
          </div>

          <GlowButton type="submit" full loading={loading}>
            Iniciar Sesión
          </GlowButton>

          <div className="login-divider">o continúa con</div>

          <GlowButton type="button" variant="ghost" full onClick={() => navigate('/app/chat')}>
            Acceso Rápido (Demo)
          </GlowButton>

          <p className="login-footer-text">
            ¿No tienes una cuenta? <a href="#">Regístrate</a>
          </p>
        </form>
      </div>
    </div>
  );
}
