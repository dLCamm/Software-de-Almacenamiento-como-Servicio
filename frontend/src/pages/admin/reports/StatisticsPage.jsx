import { useEffect, useState } from 'react'
import { getAdminStatistics, getStorageByType } from '../../../api/adminReports'
import { formatBytes } from '../../client/dashboard/formatters'
import { AdminIcon } from '../plans/AdminIcon'
import '../plans/AdminPlansPage.css'
import './ReportsPage.css'

const ROLE_LABELS = { CLIENT: 'Clientes', SUPPORT: 'Soporte', ADMIN: 'Administradores' }

function errorText(error) {
  if (error?.status === 403) return 'Tu cuenta no tiene permiso para ver las estadísticas. Solo los administradores pueden consultarlas.'
  if (error?.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.'
  return error?.message || 'No se pudieron cargar las estadísticas.'
}

const formatNumber = (value) => Number(value || 0).toLocaleString('es-GT')
// El backend no envía moneda, así que el importe se muestra sin símbolo.
const formatAmount = (value) => Number(value || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatShare = (part, total) => {
  if (!total) return '0%'
  const share = (part / total) * 100
  return share > 0 && share < 1 ? '<1%' : `${Math.round(share)}%`
}

function StatTile({ label, value, children }) {
  return <section className="stat-tile">
    <span className="stat-tile__label">{label}</span>
    <strong className="stat-tile__value">{value}</strong>
    {children && <div className="stat-tile__meta">{children}</div>}
  </section>
}

/** Barras horizontales de una sola serie: la longitud es la magnitud. */
function BarList({ rows, emptyText, labelWidth = 72 }) {
  const max = Math.max(...rows.map((row) => row.value), 0)
  if (!rows.length || !max) return <p className="report-muted report-chart-empty">{emptyText}</p>
  return <ul className="bar-list" style={{ '--bar-label-width': `${labelWidth}px` }}>
    {rows.map((row) => <li key={row.key} className="bar-list__row" tabIndex={0}>
      <span className="bar-list__label">{row.label}</span>
      <span className="bar-list__track" aria-hidden="true"><span style={{ width: `${Math.max((row.value / max) * 100, 1.5)}%` }} /></span>
      <span className="bar-list__value">{row.valueText}<small>{row.meta}</small></span>
      <span className="bar-list__tooltip" role="tooltip">{row.tooltip}</span>
    </li>)}
  </ul>
}

export default function StatisticsPage() {
  const [stats, setStats] = useState(null)
  const [byType, setByType] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([getAdminStatistics(), getStorageByType()])
      .then(([statistics, storage]) => { if (active) { setStats(statistics); setByType(storage); setError('') } })
      .catch((loadError) => { if (active) setError(errorText(loadError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const users = stats?.usuarios || {}
  const income = stats?.ingresos || {}
  const payments = stats?.pagos || {}
  const storage = stats?.almacenamiento || {}
  const approved = Number(payments.aprobados || 0)
  const rejected = Number(payments.rechazados || 0)
  const processed = approved + rejected

  const roleRows = Object.entries(users.por_rol || {})
    .map(([role, count]) => ({ key: role, label: ROLE_LABELS[role] || role, value: Number(count), valueText: formatNumber(count), meta: formatShare(count, users.total), tooltip: `${ROLE_LABELS[role] || role}: ${formatNumber(count)} (${formatShare(count, users.total)} de ${formatNumber(users.total)} usuarios)` }))
    .sort((a, b) => b.value - a.value)

  const totalTypeBytes = Number(byType?.total_usado_bytes || 0)
  const typeRows = (byType?.tipos || [])
    .map((type) => {
      const ext = (type.extension || 'sin extensión').toUpperCase()
      const files = `${formatNumber(type.archivos_count)} ${Number(type.archivos_count) === 1 ? 'archivo' : 'archivos'}`
      return { key: ext, label: ext, value: Number(type.usado_bytes), valueText: formatBytes(Number(type.usado_bytes)), meta: `${files} · ${formatShare(type.usado_bytes, totalTypeBytes)}`, tooltip: `${ext}: ${formatBytes(Number(type.usado_bytes))} en ${files} (${formatShare(type.usado_bytes, totalTypeBytes)} del total)` }
    })
    .sort((a, b) => b.value - a.value)

  return <main className="admin-page">
    <header className="admin-header">
      <div>
        <span className="admin-header__crumb">Administración</span>
        <h1>Estadísticas</h1>
        <p>Resumen global de usuarios, pagos y almacenamiento de Kubo.</p>
      </div>
    </header>

    <div className="admin-content">
      {error && <div className="admin-alert admin-alert--error" role="alert"><span>{error}</span></div>}

      {loading
        ? <div className="admin-empty"><span className="admin-spinner" />Cargando estadísticas…</div>
        : stats && <>
          <div className="stat-grid">
            <StatTile label="Usuarios" value={formatNumber(users.total)}>
              <span>{formatNumber(users.clientes)} clientes · {formatNumber(users.clientes_activos)} activos</span>
            </StatTile>
            <StatTile label="Ingresos aprobados" value={formatAmount(income.total_aprobado)}>
              <span>Suma histórica de {formatNumber(income.pagos_aprobados)} {Number(income.pagos_aprobados) === 1 ? 'pago' : 'pagos'}</span>
            </StatTile>
            <StatTile label="Pagos procesados" value={formatNumber(processed)}>
              {processed > 0 && <span className="payment-split" role="img" aria-label={`${approved} aprobados y ${rejected} rechazados`}>
                {approved > 0 && <span className="payment-split__ok" style={{ flexGrow: approved }} />}
                {rejected > 0 && <span className="payment-split__bad" style={{ flexGrow: rejected }} />}
              </span>}
              <span className="payment-legend"><span><i className="dot dot--ok" />{formatNumber(approved)} aprobados</span><span><i className="dot dot--bad" />{formatNumber(rejected)} rechazados</span></span>
            </StatTile>
            <StatTile label="Almacenamiento usado" value={formatBytes(Number(storage.usado_bytes || 0))}>
              <span>{formatNumber(storage.archivos_activos_y_en_papelera)} archivos (incluye papelera)</span>
            </StatTile>
          </div>

          <div className="report-grid">
            <section className="report-card">
              <header><h2>Almacenamiento por tipo de archivo</h2><span>{formatBytes(totalTypeBytes)} en total</span></header>
              <BarList rows={typeRows} emptyText="Todavía no hay archivos subidos." />
            </section>
            <section className="report-card">
              <header><h2>Usuarios por rol</h2><span>{formatNumber(users.total)} cuentas</span></header>
              <BarList rows={roleRows} emptyText="No hay usuarios registrados." labelWidth={124} />
            </section>
          </div>

          <p className="report-footnote"><AdminIcon name="layers" size={14} />El almacenamiento incluye archivos activos y en papelera; no cuenta los eliminados definitivamente.</p>
        </>}
    </div>
  </main>
}
