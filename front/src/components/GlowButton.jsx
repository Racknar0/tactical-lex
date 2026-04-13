import './GlowButton.css';

export default function GlowButton({
  children,
  variant = 'primary',
  size = '',
  full = false,
  loading = false,
  disabled = false,
  className = '',
  ...rest
}) {
  const classes = [
    'glow-btn',
    variant,
    size === 'small' ? 'small' : '',
    full ? 'full' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {loading && <span className="btn-spinner" />}
      {children}
    </button>
  );
}
