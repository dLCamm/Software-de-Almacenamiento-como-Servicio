import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminStatistics } from '../../../api/adminReports'
import { getProfile } from '../../../api/auth'
import { formatBytes } from '../../client/dashboard/formatters'
import '../plans/AdminPlansPage.css'
import './AdminHomePage.css'

const formatNumber = (value) => Number(value || 0).toLocaleString('es-GT')

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
    </div>
  </main>
}
