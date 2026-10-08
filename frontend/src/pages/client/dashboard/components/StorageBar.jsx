import { formatBytes } from '../formatters'
import Icon from './Icon'

export default function StorageBar({ usage, onUpgrade }) {
  const percent = Math.min(100, Math.max(0, Number(usage?.porcentaje_usado) || 0))
  const monthlyPrice = Number(usage?.plan_precio_mensual || 0)
  return <section className="storage-overview" aria-label="Uso de almacenamiento">
    <div className="storage-track" aria-label={`${percent.toFixed(1)} por ciento utilizado`}><span style={{ width: `${percent}%` }} /></div>
    <span className="storage-caption">{formatBytes(usage?.usado_bytes)} / {formatBytes(usage?.maximo_bytes)} · Disponible: {formatBytes(usage?.disponible_bytes)}</span>
    <div className="plan-summary">
      <strong>Plan {usage?.plan_nombre || 'FREE'}</strong>
      <span>{monthlyPrice === 0 ? 'Gratis' : `Q${monthlyPrice.toLocaleString('es-GT')}/mes`}</span>
      {usage?.plan_pendiente_nombre && <small>Solicitud pendiente: {usage.plan_pendiente_nombre}</small>}
    </div>
    <button className="storage-upgrade-button" type="button" onClick={onUpgrade}>
      <Icon name="upgrade" />
      <span>Ampliar almacenamiento</span>
      <small>desde Q149</small>
    </button>
  </section>
}
