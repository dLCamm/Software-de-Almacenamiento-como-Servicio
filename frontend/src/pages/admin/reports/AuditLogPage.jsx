import { useEffect, useState } from 'react'
import { listAuditEvents } from '../../../api/adminReports'
import { AdminIcon } from '../plans/AdminIcon'
import { formatDateTime, formatDetails, getActionLabel, getActionTone, getResourceLabel, shortId } from './auditFormat'
import '../plans/AdminPlansPage.css'
import './ReportsPage.css'


function errorText(error) {
  if (error?.status === 403) return 'Tu cuenta no tiene permiso para ver la auditoría. Solo los administradores pueden consultarla.'
  if (error?.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.'
  return error?.message || 'No se pudo cargar la auditoría.'
}

export default function AuditLogPage() {
  const [data, setData] = useState({ count: 0, next: null, previous: null, results: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    listAuditEvents({ page_size: 50 })
      .then((response) => {
        if (!active) return
        // Acepta respuesta paginada ({ count, results }) o una lista simple.
        const results = Array.isArray(response) ? response : response?.results || []
        setData({ count: response?.count ?? results.length, next: response?.next ?? null, previous: response?.previous ?? null, results })
        setError('')
      })
      .catch((loadError) => { if (active) setError(errorText(loadError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])


  return <main className="admin-page">
    <header className="admin-header">
      <div>
        <span className="admin-header__crumb">Administración</span>
        <h1>Auditoría</h1>
        <p>{loading && !data.results.length ? 'Cargando eventos…' : `${data.count.toLocaleString('es-GT')} ${data.count === 1 ? 'evento registrado' : 'eventos registrados'}`}</p>
      </div>
    </header>

    <div className="admin-content">
      {error && <div className="admin-alert admin-alert--error" role="alert"><span>{error}</span></div>}

      {loading && !data.results.length
        ? <div className="admin-empty"><span className="admin-spinner" />Cargando eventos…</div>
        : !data.results.length
          ? !error && <div className="admin-empty"><AdminIcon name="layers" size={34} /><h2>Aún no hay eventos</h2><p>Aquí aparecerán los registros, inicios de sesión, operaciones de archivos y pagos.</p></div>
          : <div className="admin-table-wrap report-table-wrap">
              <table className="admin-table report-table">
                <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Recurso</th><th>Detalles</th></tr></thead>
                <tbody>
                  {data.results.map((event) => {
                    const details = formatDetails(event.details)
                    const isSystem = event.action?.startsWith('system.')
                    return <tr key={event.id}>
                      <td data-label="Fecha" className="report-date">{formatDateTime(event.created_at)}</td>
                      <td data-label="Usuario">{event.actor_email
                        ? <span className="report-actor" title={event.actor_id ? `${event.actor_email} · usuario #${event.actor_id}` : event.actor_email}>{event.actor_email}</span>
                        : <span className="report-muted">{isSystem ? 'Sistema' : 'Cuenta eliminada'}</span>}</td>
                      <td data-label="Acción"><span className={`report-action report-action--${getActionTone(event.action)}`}><i aria-hidden="true" />{getActionLabel(event.action)}</span></td>
                      <td data-label="Recurso"><span className="report-resource">{getResourceLabel(event.resource_type)}{event.resource_id && <code title={event.resource_id}>{shortId(event.resource_id)}</code>}</span></td>
                      <td data-label="Detalles">{details.length
                        ? <dl className="report-details">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
                        : <span className="report-muted">—</span>}</td>
                    </tr>
                  })}
                </tbody>
              </table>
            </div>}
    </div>
  </main>
}
