import './GlassCard.css';

export default function GlassCard({ children, title, subtitle, hoverable = false, className = '', ...rest }) {
  return (
    <div className={`glass-card-component ${hoverable ? 'hoverable' : ''} ${className}`} {...rest}>
      {title && <h3 className="card-title">{title}</h3>}
      {subtitle && <p className="card-subtitle">{subtitle}</p>}
      {children}
    </div>
  );
}
