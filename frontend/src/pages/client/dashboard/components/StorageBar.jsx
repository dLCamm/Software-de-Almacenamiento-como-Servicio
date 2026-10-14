import { formatBytes } from '../formatters'
import Icon from './Icon'
import { formatUsagePercent, getUsagePercent, getVisualPercent } from '../../../../utils/storageUsage'

export default function StorageBar({ usage, onUpgrade }) {
  const percent = getUsagePercent(usage)
  const monthlyPrice = Number(usage?.plan_precio_mensual || 0)
  return <section className="storage-overview" aria-label="Uso de almacenamiento">
    <div className="storage-track" role="img" aria-label={`${formatUsagePercent(percent)} utilizado`}><span style={{ width: `${getVisualPercent(percent)}%` }} /></div>
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
