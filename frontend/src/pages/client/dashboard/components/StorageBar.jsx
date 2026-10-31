import { formatBytes } from '../formatters'
import Icon from './Icon'
import { formatUsagePercent, getUsagePercent } from '../../../../utils/storageUsage'

/**
 * Barra de uso de la unidad.
 * Para el administrador (`isAdmin`) muestra el uso de TODO el sistema (`systemStorage`, el mismo dato
 * que la barra lateral) en lugar de un plan, y el botón lleva a las estadísticas.
 */
export default function StorageBar({ usage, onUpgrade, isAdmin = false, systemStorage = null, onSystemStorage }) {
  if (isAdmin) {
    return <section className="storage-overview storage-overview--system" aria-label="Uso de almacenamiento del sistema">
      <div className="system-usage">
        <span>Uso del sistema</span>
        <strong>{systemStorage ? formatBytes(systemStorage.usedBytes) : '—'}</strong>
      </div>
      <div className="storage-meta">
        <span className="storage-caption">{systemStorage
          ? `${systemStorage.files.toLocaleString('es-GT')} archivos (incluye papelera) · ${systemStorage.users.toLocaleString('es-GT')} usuarios`
          : 'Cargando uso del sistema…'}</span>
        <div className="plan-summary"><strong>Cuenta de administrador</strong><span>Tus archivos: {formatBytes(usage?.usado_bytes)}</span></div>
      </div>
      <button className="storage-upgrade-button" type="button" onClick={onSystemStorage}>
        <Icon name="grid" />
        <span>Ver estadísticas</span>
      </button>
    </section>
  }

  const percent = getUsagePercent(usage)
  const monthlyPrice = Number(usage?.plan_precio_mensual || 0)
  return <section className="storage-overview" aria-label="Uso de almacenamiento">
    <div className="storage-track" role="img" aria-label={`${formatUsagePercent(percent)} utilizado`}><span style={{ width: `${percent}%` }} /></div>
    <div className="storage-meta">
      <span className="storage-caption">{formatUsagePercent(percent)} usado · {formatBytes(usage?.usado_bytes)} / {formatBytes(usage?.maximo_bytes)} · Disponible: {formatBytes(usage?.disponible_bytes)}</span>
      <div className="plan-summary">
        <strong>Plan {usage?.plan_nombre || 'FREE'}</strong>
        <span>{monthlyPrice === 0 ? 'Gratis' : `Q${monthlyPrice.toLocaleString('es-GT')}/mes`}</span>
        {usage?.plan_pendiente_nombre && <small>Solicitud pendiente: {usage.plan_pendiente_nombre}</small>}
      </div>
    </div>
    <button className="storage-upgrade-button" type="button" onClick={onUpgrade}>
      <Icon name="upgrade" />
      <span>Ampliar almacenamiento</span>
      <small>desde Q149</small>
    </button>
  </section>
}
