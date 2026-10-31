import { useEffect, useState } from 'react'
import { listAdminPlans } from '../../../api/adminPlans'
import { listAuditEvents } from '../../../api/adminReports'
import { AdminIcon } from '../plans/AdminIcon'
import TablePagination from '../shared/TablePagination'
import { AUDIT_ACTION_GROUPS, RESOURCE_TYPES, formatDateTime, formatDetails, getActionLabel, getActionTone, getResourceLabel, shortId } from './auditFormat'
import '../plans/AdminPlansPage.css'
import '../management/ManagementPage.css'
import './ReportsPage.css'

const PAGE_SIZES = [25, 50, 100]
const emptyForm = { action: '', resource_type: '' }

function errorText(error) {
  if (error?.status === 403) return 'Tu cuenta no tiene permiso para ver la auditoría. Solo los administradores pueden consultarla.'
  if (error?.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.'
  return error?.message || 'No se pudo cargar la auditoría.'
}

export default function AuditLogPage() {
  const [form, setForm] = useState(emptyForm)
  const [filters, setFilters] = useState({})
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [data, setData] = useState({ count: 0, next: null, previous: null, results: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [planNames, setPlanNames] = useState({})

  useEffect(() => {
    let active = true
    listAuditEvents({ ...filters, page, page_size: pageSize })
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
  }, [filters, page, pageSize])

  // Nombres de los planes para mostrar "PRO → PREMIUM" en lugar de ids.
  useEffect(() => {
    listAdminPlans()
      .then((plans) => setPlanNames(Object.fromEntries((Array.isArray(plans) ? plans : plans?.results || []).map((plan) => [plan.id, plan.name]))))
      .catch(() => {})
  }, [])

  function changeField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function applyFilters(event) {
    event.preventDefault()
    setLoading(true)
    setPage(1)
    setFilters(Object.fromEntries(Object.entries(form).filter(([, value]) => value !== '')))
  }

  function clearFilters() {
    setLoading(true)
    setForm(emptyForm)
    setPage(1)
    setFilters({})
  }

  function goToPage(nextPage) {
    setLoading(true)
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const hasFilters = Object.keys(filters).length > 0

  return <main className="admin-page">
    <header className="admin-header">
      <div>
        <span className="admin-header__crumb">Administración</span>
        <h1>Auditoría</h1>
        <p>{loading && !data.results.length ? 'Cargando eventos…' : `${data.count.toLocaleString('es-GT')} ${data.count === 1 ? 'evento registrado' : 'eventos registrados'}${hasFilters ? ' con estos filtros' : ''}`}</p>
      </div>
    </header>

    <div className="admin-content">
      <form className="management-filters report-filters" onSubmit={applyFilters}>
        <label className="admin-field"><span>Acción</span>
          <select name="action" value={form.action} onChange={changeField}>
            <option value="">Todas</option>
            {AUDIT_ACTION_GROUPS.map((group) => <optgroup key={group.label} label={group.label}>
              {group.actions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </optgroup>)}
          </select>
        </label>
        <label className="admin-field"><span>Tipo de recurso</span>
          <select name="resource_type" value={form.resource_type} onChange={changeField}>
            <option value="">Todos</option>
            {RESOURCE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <div className="management-filter-actions"><button className="admin-button admin-button--primary" type="submit">Filtrar</button><button className="admin-button admin-button--secondary" type="button" onClick={clearFilters} disabled={!hasFilters && !form.action && !form.resource_type}>Limpiar</button></div>
      </form>

      {error && <div className="admin-alert admin-alert--error" role="alert"><span>{error}</span></div>}

      {loading && !data.results.length
        ? <div className="admin-empty"><span className="admin-spinner" />Cargando eventos…</div>
        : !data.results.length
          ? !error && <div className="admin-empty"><AdminIcon name="layers" size={34} /><h2>{hasFilters ? 'No hay eventos con estos filtros' : 'Aún no hay eventos'}</h2><p>{hasFilters ? 'Prueba con otra acción o tipo de recurso.' : 'Aquí aparecerán los registros, inicios de sesión, operaciones de archivos y pagos.'}</p></div>
          : <>
            <div className={`admin-table-wrap report-table-wrap${loading ? ' is-loading' : ''}`}>
              <table className="admin-table report-table">
                <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Recurso</th><th>Detalles</th></tr></thead>
                <tbody>
                  {data.results.map((event) => {
                    const details = formatDetails(event.details, planNames)
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
            </div>

            <TablePagination page={page} pageSize={pageSize} total={data.count} sizes={PAGE_SIZES} disabled={loading} label="Paginación de eventos"
              onPageChange={goToPage} onPageSizeChange={(size) => { setLoading(true); setPage(1); setPageSize(size) }} />
          </>}
    </div>
  </main>
}
