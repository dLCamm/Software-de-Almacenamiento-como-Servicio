import Icon from './Icon'
import { formatBytes } from '../formatters'

export default function StorageBar({ usage, onUpgrade }) {
  const percent = Math.min(100, Math.max(0, Number(usage?.porcentaje_usado) || 0))
  return <section className="storage-overview" aria-label="Uso de almacenamiento">
    <div className="storage-track" aria-label={`${percent.toFixed(1)} por ciento utilizado`}><span style={{ width: `${percent}%` }} /></div>
    <span className="storage-caption">{formatBytes(usage?.usado_bytes)} / {formatBytes(usage?.maximo_bytes)}</span>
    <button className="upgrade-button" type="button" onClick={onUpgrade}><Icon name="upgrade" /><span>Ampliar almacenamiento</span><small>desde Q149</small></button>
  </section>
}
