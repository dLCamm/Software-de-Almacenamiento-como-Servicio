import { formatBytes } from '../../dashboard/formatters'
import BillingIcon from './BillingIcon'

function formatMoney(value) {
  const amount = Number(value || 0)
  return `Q${amount.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ`
}

function formatDate(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

export default function BillingSummary({ usage, currentPlan, nextBillingDate, onViewPlans }) {
  const percent = Math.min(100, Math.max(0, Number(usage?.porcentaje_usado) || 0))
  const dateLabel = formatDate(nextBillingDate)
  const price = Number(currentPlan?.price ?? usage?.plan_precio_mensual ?? 0)

  return <div className="billing-summary">
    <div className="billing-summary-grid">
      <section className="billing-card usage-card">
        <h2>Almacenamiento utilizado</h2>
        <div className="usage-card__body">
          <div className="usage-donut" style={{ '--usage-percent': `${percent}%` }} role="img" aria-label={`${percent.toFixed(0)} por ciento del almacenamiento utilizado`}>
            <div className="usage-donut__center"><strong>{percent.toFixed(0)}%</strong><span>usado</span></div>
          </div>
          <div className="usage-total"><span>Espacio usado</span><strong>{formatBytes(usage?.usado_bytes)}</strong><span>de {formatBytes(usage?.maximo_bytes)}</span></div>
        </div>
      </section>

      <section className="billing-card breakdown-card">
        <h2>Desglose por tipo</h2>
        <div className="breakdown-unavailable"><BillingIcon name="chart" size={25} /><p>La API actual informa el uso total, pero no separa el almacenamiento por tipo de archivo.</p></div>
        <div className="breakdown-total"><span>Total usado</span><strong>{formatBytes(usage?.usado_bytes)} / {formatBytes(usage?.maximo_bytes)}</strong></div>
      </section>
    </div>

    <section className="next-charge-card">
      <div className="next-charge-card__icon"><BillingIcon name="clock" size={25} /></div>
      <div className="next-charge-card__details"><strong>{price > 0 ? 'Próximo cobro' : 'Plan gratuito'}</strong><span>{price > 0 ? dateLabel || 'La API no proporciona la fecha del próximo cobro.' : 'Tu plan actual no genera cargos.'}</span></div>
      <strong className="next-charge-card__amount">{price > 0 ? formatMoney(price) : 'Q0.00 GTQ'}</strong>
    </section>

    <div className="billing-summary__footer"><span>Plan actual: <strong>{currentPlan?.name || usage?.plan_nombre || '—'}</strong></span><button className="billing-button billing-button--secondary" type="button" onClick={onViewPlans}>Ver planes</button></div>
  </div>
}
