import { formatBytes } from '../formatters'
import Icon from './Icon'
import { formatUsagePercent, getUsagePercent } from '../../../../utils/storageUsage'

/** Barra de uso de la unidad del usuario: porcentaje, plan actual y botón para ampliar. */
export default function StorageBar({ usage, onUpgrade }) {
  const percent = getUsagePercent(usage)
  const monthlyPrice = Number(usage?.plan_precio_mensual || 0)
  const isFree = monthlyPrice === 0
  return <section className="storage-overview" aria-label="Uso de almacenamiento" aria-busy={!usage}>
    <div className="storage-track" role="img" aria-label={`${formatUsagePercent(percent)} utilizado`}><span style={{ width: `${percent}%` }} /></div>
    <div className="storage-meta">
      {usage
        ? <>
          <span className="storage-caption">{formatUsagePercent(percent)} usado · {formatBytes(usage.usado_bytes)} / {formatBytes(usage.maximo_bytes)} · Disponible: {formatBytes(usage.disponible_bytes)}</span>
          <div className="plan-summary">
            <strong>Plan {usage.plan_nombre || 'FREE'}</strong>
            <span>{isFree ? 'Gratis' : `Q${monthlyPrice.toLocaleString('es-GT')}/mes`}</span>
            {usage.plan_pendiente_nombre && <small>Solicitud pendiente: {usage.plan_pendiente_nombre}</small>}
          </div>
        </>
        : <span className="file-skeleton__shape storage-caption__skeleton" aria-hidden="true" />}
    </div>
    <button className="storage-upgrade-button" type="button" onClick={onUpgrade}>
      <Icon name="upgrade" />
      <span>{isFree ? 'Ampliar almacenamiento' : 'Ver planes'}</span>
      {isFree && <small>desde Q149</small>}
    </button>
  </section>
}
