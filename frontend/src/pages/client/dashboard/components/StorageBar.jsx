import { formatBytes } from '../formatters'
import Icon from './Icon'
import { formatUsagePercent, getUsagePercent } from '../../../../utils/storageUsage'

/** Tarjeta de almacenamiento: espacio usado, barra, plan actual y botón para ver planes. */
export default function StorageBar({ usage, onUpgrade }) {
  const percent = getUsagePercent(usage)
  const monthlyPrice = Number(usage?.plan_precio_mensual || 0)
  const isFree = monthlyPrice === 0
  const level = percent >= 90 ? ' is-critical' : percent >= 75 ? ' is-warning' : ''
  return <section className={`storage-card${level}`} aria-label="Uso de almacenamiento" aria-busy={!usage}>
    <div className="storage-card__head">
      <span className="storage-card__icon" aria-hidden="true"><Icon name="cloud" size={22} /></span>
      <div className="storage-card__amount">
        <span>Almacenamiento</span>
        {usage
          ? <strong>{formatBytes(usage.usado_bytes)} <small>de {formatBytes(usage.maximo_bytes)}</small></strong>
          : <span className="file-skeleton__shape storage-caption__skeleton" aria-hidden="true" />}
      </div>
      <button className="storage-card__button" type="button" onClick={onUpgrade}>
        <Icon name="upgrade" size={18} />
        <span>{isFree ? 'Ampliar' : 'Ver planes'}</span>
      </button>
    </div>
    <div className="storage-track" role="img" aria-label={`${formatUsagePercent(percent)} utilizado`}><span style={{ width: `${Math.max(percent, usage?.usado_bytes ? 1 : 0)}%` }} /></div>
    {usage && <div className="storage-card__foot">
      <span className="plan-chip"><strong>Plan {usage.plan_nombre || 'FREE'}</strong>{isFree ? 'Gratis' : `Q${monthlyPrice.toLocaleString('es-GT')}/mes`}</span>
      <span className="storage-card__free">{formatBytes(usage.disponible_bytes)} disponibles · {formatUsagePercent(percent)} usado</span>
    </div>}
    {usage?.plan_pendiente_nombre && <p className="storage-card__pending">Solicitud pendiente: {usage.plan_pendiente_nombre}</p>}
  </section>
}
