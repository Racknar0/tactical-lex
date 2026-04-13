import { Link } from 'react-router-dom';
import { Send, Scale, FolderOpen, Brain, Sparkles } from 'lucide-react';
import './LandingPage.css';

const features = [
  {
    icon: Scale,
    title: 'Consulta Legal IA',
    desc: 'Obtén respuestas fundamentadas en tus documentos legales con inteligencia artificial de última generación.',
  },
  {
    icon: FolderOpen,
    title: 'Bóveda de Documentos',
    desc: 'Carga, indexa y administra tus documentos legales en stores de contexto inteligentes.',
  },
  {
    icon: Brain,
    title: 'Análisis Cognitivo',
    desc: 'Motor RAG avanzado con memoria de sesión, múltiples modos de conversación y fuentes verificables.',
  },
];

const pills = [
  'Derecho Laboral',
  'Contratos Civiles',
  'Derecho Penal',
  'Propiedad Intelectual',
  'Derecho Mercantil',
  'Código Tributario',
  'Derecho Familiar',
];

export default function LandingPage() {
  return (
    <div className="landing">
      {/* Background Orbs */}
      <div className="landing-orb orb-1" />
      <div className="landing-orb orb-2" />
      <div className="landing-orb orb-3" />

      {/* Header */}
      <header className="landing-header">
        <div className="landing-header-logo">
          <div className="logo-icon">TL</div>
          <span>Tactical Lex</span>
        </div>
        <nav className="landing-header-nav">
          <a href="#features">Funciones</a>
          <a href="#about">Acerca de</a>
          <Link to="/login" className="nav-cta">Iniciar Sesión</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="hero-badge">
          <span className="dot" />
          Plataforma de Consulta Legal con IA
        </div>

        <h1 className="hero-title">
          Tu Asistente{' '}
          <span className="text-gradient">Legal Inteligente</span>
        </h1>

        <p className="hero-subtitle">
          Consulta, analiza y recupera información de tus documentos legales con la potencia de la inteligencia artificial. Respuestas fundamentadas, verificables y en tiempo real.
        </p>

        <div className="hero-search">
          <Sparkles size={20} color="var(--text-muted)" />
          <input type="text" placeholder="Pregunta algo sobre tus documentos legales..." readOnly />
          <Link to="/login" className="search-send">
            <Send size={18} />
          </Link>
        </div>

        <div className="hero-pills">
          {pills.map((pill) => (
            <span key={pill} className="hero-pill">{pill}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="landing-features" id="features">
        <h2 className="features-title">
          Todo lo que necesitas para tu{' '}
          <span className="text-gradient">práctica legal</span>
        </h2>

        <div className="features-grid">
          {features.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">
                <f.icon size={26} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2026 Tactical Lex — Plataforma de Consulta Legal con IA. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
