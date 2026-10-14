import useTheme from '../theme/useTheme'
import './ThemeToggle.css'

const icons = {
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></>,
  moon: <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z" />,
}

/**
 * Botón para cambiar entre modo claro y oscuro.
 * variant="icon": solo el ícono (para encabezados).  variant="row": ícono + texto (para la barra lateral).
 */
export default function ThemeToggle({ variant = 'icon', className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'
  const label = isLight ? 'Modo oscuro' : 'Modo claro'

  return <button
    type="button"
    className={`theme-toggle theme-toggle--${variant} ${className}`.trim()}
    onClick={toggleTheme}
    aria-label={`Cambiar a ${label.toLowerCase()}`}
    title={`Cambiar a ${label.toLowerCase()}`}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {isLight ? icons.moon : icons.sun}
    </svg>
    {variant === 'row' && <span>{label}</span>}
  </button>
}
