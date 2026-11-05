import { useId, useState } from 'react'
import './MobileFilters.css'

/** En celular, oculta los filtros detrás de un botón desplegable; en escritorio se ven siempre. */
export default function MobileFilters({ children, label = 'Filtros' }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return <div className={`mobile-filters${open ? ' is-open' : ''}`}>
    <button className="mobile-filters__toggle" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls={id}>
      <span>{open ? `Ocultar ${label.toLowerCase()}` : label}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    <div id={id} style={{ display: 'contents' }}>{children}</div>
  </div>
}
