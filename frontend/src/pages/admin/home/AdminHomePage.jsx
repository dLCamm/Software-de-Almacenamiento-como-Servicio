import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminStatistics } from '../../../api/adminReports'
import { getProfile } from '../../../api/auth'
import { formatBytes } from '../../client/dashboard/formatters'
import '../plans/AdminPlansPage.css'
import '../reports/ReportsPage.css'
import './AdminHomePage.css'

const formatNumber = (value) => Number(value || 0).toLocaleString('es-GT')
const formatAmount = (value) => Number(value || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Accesos rápidos a cada sección de Administración.
const SECTIONS = [
  { to: '/app/admin/usuarios', title: 'Usuarios', text: 'Busca cuentas, revisa su plan y actívalas o desactívalas.' },
  { to: '/app/admin/pagos', title: 'Pagos', text: 'Historial global de transacciones con filtros por estado y tipo.' },
  { to: '/app/admin/planes', title: 'Planes', text: 'Crea, edita y ordena los planes que ven los clientes.' },
  { to: '/app/admin/estadisticas', title: 'Estadísticas', text: 'Almacenamiento por tipo de archivo y usuarios por rol.' },
  { to: '/app/admin/auditoria', title: 'Auditoría', text: 'Registro de inicios de sesión, operaciones de archivos y pagos.' },
]

function displayName(profile) {
  return [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.email || 'Administrador'
}

/** Inicio del administrador: quién está conectado y un resumen del sistema. */
export default function AdminHomePage() {
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getProfile().then((data) => { if (active) setProfile(data) }).catch(() => {})
    getAdminStatistics()
      .then((data) => { if (active) setStats(data) })
      .catch((loadError) => { if (active) setError(loadError?.message || 'No se pudo cargar el resumen del sistema.') })
    return () => { active = false }
  }, [])

  const storage = stats?.almacenamiento || {}
  const users = stats?.usuarios || {}
  const income = stats?.ingresos || {}
  const payments = stats?.pagos || {}

  return <main className="admin-page admin-home">
    <header className="admin-header">
      <div>
        <span className="admin-header__crumb">Administración</span>
        <h1>Hola, {profile ? displayName(profile) : '…'}</h1>
        <p className="admin-home__identity">
          {/* Si no tiene nombre, el correo ya aparece en el saludo y no se repite. */}
          {profile?.email && displayName(profile) !== profile.email && <span>{profile.email}</span>}
          <span className="admin-home__role">Cuenta de administrador</span>
        </p>
      </div>
    </header>

    <div className="admin-content">
      {error && <div className="admin-alert admin-alert--error" role="alert"><span>{error}</span></div>}

      <section className="admin-home__storage" aria-labelledby="admin-home-storage">
        <div>
          <h2 id="admin-home-storage">Uso del sistema</h2>
          <strong className="admin-home__storage-value">{stats ? formatBytes(Number(storage.usado_bytes || 0)) : '—'}</strong>
          <p>{stats
            ? `${formatNumber(storage.archivos_activos_y_en_papelera)} archivos (incluye papelera) · ${formatNumber(users.total)} usuarios`
            : error ? 'Sin datos por ahora.' : 'Cargando uso del sistema…'}</p>
        </div>
        <Link className="admin-button admin-button--primary" to="/app/admin/estadisticas">Ver estadísticas</Link>
      </section>

      {stats && <div className="stat-grid admin-home__summary">
        <section className="stat-tile">
          <span className="stat-tile__label">Usuarios</span>
          <strong className="stat-tile__value">{formatNumber(users.total)}</strong>
          <div className="stat-tile__meta"><span>{formatNumber(users.clientes)} clientes · {formatNumber(users.clientes_activos)} activos</span></div>
        </section>
        <section className="stat-tile">
          <span className="stat-tile__label">Ingresos aprobados</span>
          <strong className="stat-tile__value">{formatAmount(income.total_aprobado)}</strong>
          <div className="stat-tile__meta"><span>{formatNumber(income.pagos_aprobados)} {Number(income.pagos_aprobados) === 1 ? 'pago aprobado' : 'pagos aprobados'}</span></div>
        </section>
        <section className="stat-tile">
          <span className="stat-tile__label">Pagos rechazados</span>
          <strong className="stat-tile__value">{formatNumber(payments.rechazados)}</strong>
          <div className="stat-tile__meta"><span>de {formatNumber(Number(payments.aprobados || 0) + Number(payments.rechazados || 0))} procesados</span></div>
        </section>
      </div>}

      <section className="admin-home__sections" aria-labelledby="admin-home-sections">
        <h2 id="admin-home-sections">Secciones</h2>
        <div className="admin-home__links">
          {SECTIONS.map((section) => <Link key={section.to} className="admin-home__link" to={section.to}>
            <strong>{section.title}<span aria-hidden="true">→</span></strong>
            <span>{section.text}</span>
          </Link>)}
        </div>
      </section>
    </div>
  </main>
}
