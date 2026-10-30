import { useEffect, useState } from 'react'
import { getAdminStatistics } from '../../../api/adminReports'
import { formatBytes } from '../../client/dashboard/formatters'
import '../plans/AdminPlansPage.css'
import './ReportsPage.css'


function errorText(error) {
  if (error?.status === 403) return 'Tu cuenta no tiene permiso para ver las estadísticas. Solo los administradores pueden consultarlas.'
  if (error?.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.'
  return error?.message || 'No se pudieron cargar las estadísticas.'
}

const formatNumber = (value) => Number(value || 0).toLocaleString('es-GT')
// El backend no envía moneda, así que el importe se muestra sin símbolo.
const formatAmount = (value) => Number(value || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
function StatTile({ label, value, children }) {
  return <section className="stat-tile">
    <span className="stat-tile__label">{label}</span>
    <strong className="stat-tile__value">{value}</strong>
    {children && <div className="stat-tile__meta">{children}</div>}
  </section>
}

export default function StatisticsPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getAdminStatistics()
      .then((statistics) => { if (active) { setStats(statistics); setError('') } })
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

        </>}
    </div>
  </main>
}
