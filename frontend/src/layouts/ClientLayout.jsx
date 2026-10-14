import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getProfile, logout } from '../api/auth'
import { getStorageUsage } from '../api/storage'
import { CubeLogoIcon } from '../components/icons'
import ThemeToggle from '../components/ThemeToggle'
import { formatBytes } from '../pages/client/dashboard/formatters'
import { getUsagePercent, getVisualPercent, subscribeStorageUsage } from '../utils/storageUsage'
import './ClientLayout.css'

const paths = {
  files: <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" />,
  billing: <><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M2.5 10h19M6 15h4" /></>,
  support: <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="13" width="4" height="6" rx="1.5" /><rect x="17" y="13" width="4" height="6" rx="1.5" /></>,
  admin: <path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.3 7.5 9.5 4.4-1.2 7.5-4.9 7.5-9.5V6z" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
  chevron: <path d="m9 6 6 6-6 6" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m5 5 14 14M19 5 5 19" />,
}

function NavIcon({ name, size = 20 }) {
  return <svg className="client-nav__icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

// Opciones de la barra lateral. `roles` limita quién las ve (undefined = todos).
// `ready: false` muestra el enlace deshabilitado hasta que exista la página.
// `children` son sub-opciones que se despliegan cuando estás dentro de esa sección.
const NAV_ITEMS = [
  { to: '/app/client', label: 'Mis Archivos', icon: 'files', end: true },
  {
    to: '/app/client/billing', label: 'Planes y Facturación', icon: 'billing',
    children: [
      { to: '/app/client/billing', label: 'Resumen', end: true },
      { to: '/app/client/billing/planes', label: 'Planes' },
      { to: '/app/client/billing/pago', label: 'Método de pago' },
      { to: '/app/client/billing/historial', label: 'Historial' },
    ],
  },
  { to: '/app/support', label: 'Soporte Técnico', icon: 'support', roles: ['SUPPORT', 'ADMIN'], ready: false },
  {
    to: '/app/admin', label: 'Administrador', icon: 'admin', roles: ['ADMIN'],
    children: [
      { to: '/app/admin/planes', label: 'Gestión de planes' },
    ],
  },
]

export default function ClientLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [profile, setProfile] = useState(null)
  const [usage, setUsage] = useState(null)
  const [open, setOpen] = useState(false)

  // Cualquier pantalla que consulte el uso (subir, borrar, restaurar, pagar…) actualiza esta barra.
  useEffect(() => subscribeStorageUsage(setUsage), [])

  useEffect(() => {
    let active = true
    getProfile().then((data) => { if (active) setProfile(data) }).catch(() => {})
    return () => { active = false }
  }, [])

  // También se vuelve a pedir al cambiar de página (la respuesta llega por subscribeStorageUsage).
  useEffect(() => {
    getStorageUsage().catch(() => {})
  }, [pathname])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const role = profile?.role
  const isInside = (item) => item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role))
  const percent = getUsagePercent(usage)

  return <div className={`client-layout ${open ? 'is-nav-open' : ''}`}>
    <button className="client-nav__toggle" type="button" onClick={() => setOpen(true)} aria-label="Abrir menú"><NavIcon name="menu" /></button>
    <div className="client-nav__scrim" onClick={() => setOpen(false)} aria-hidden="true" />

    <aside className="client-nav" aria-label="Navegación principal">
      <div className="client-nav__brand">
        <span className="client-nav__logo"><CubeLogoIcon width={22} height={22} /></span>
        <strong>Kubo</strong>
        <button className="client-nav__close" type="button" onClick={() => setOpen(false)} aria-label="Cerrar menú"><NavIcon name="close" size={18} /></button>
      </div>

      <nav className="client-nav__links">
        {items.map((item) => item.ready === false
          ? <span key={item.to} className="client-nav__link is-disabled" aria-disabled="true" title="Próximamente"><NavIcon name={item.icon} /><span>{item.label}</span><small>Pronto</small></span>
          : <div key={item.to} className="client-nav__group">
              <NavLink to={item.children ? item.children[0].to : item.to} end={item.end} onClick={() => setOpen(false)} className={() => `client-nav__link ${isInside(item) ? 'is-active' : ''} ${item.children ? 'has-children' : ''}`}>
                <NavIcon name={item.icon} /><span>{item.label}</span><NavIcon name="chevron" size={15} />
              </NavLink>
              {item.children && isInside(item) && <div className="client-nav__sub">
                {item.children.map((child) => <NavLink key={child.to} to={child.to} end={child.end} onClick={() => setOpen(false)} className={({ isActive }) => `client-nav__sublink ${isActive ? 'is-active' : ''}`}>{child.label}</NavLink>)}
              </div>}
            </div>)}
      </nav>

      <div className="client-nav__storage">
        <div className="client-nav__storage-head"><span>Almacenamiento</span><strong>{formatBytes(usage?.usado_bytes)} / {formatBytes(usage?.maximo_bytes)}</strong></div>
        <div className="client-nav__storage-track" role="img" aria-label={`${percent.toFixed(2)} por ciento utilizado`}><span style={{ width: `${getVisualPercent(percent)}%` }} /></div>
        <small>{formatBytes(usage?.disponible_bytes)} disponibles</small>
      </div>

      <div className="client-nav__footer">
        <ThemeToggle variant="row" className="client-nav__link" />
        <span className="client-nav__link is-disabled" aria-disabled="true" title="Próximamente"><NavIcon name="settings" /><span>Configuración</span></span>
        <button className="client-nav__link" type="button" onClick={handleLogout}><NavIcon name="logout" /><span>Cerrar sesión</span></button>
      </div>
    </aside>

    <div className="client-layout__main"><Outlet /></div>
  </div>
}
