import { formatBytes } from '../../dashboard/formatters'
import BillingIcon from './BillingIcon'
import { formatUsagePercent, getUsagePercent, getVisualPercent } from '../../../../utils/storageUsage'

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

function daysUntil(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000))
}

function daysLabel(days) {
  if (days === null || days === undefined) return ''
  if (days === 0) return 'hoy'
  return days === 1 ? 'mañana' : `en ${days} días`
}

/** Título y texto de la tarjeta de próximo cobro según el estado de la suscripción. */
function getNextCharge({ price, subscription, nextBillingDate }) {
  if (price <= 0) return { title: 'Plan gratuito', text: 'Tu plan actual no genera cargos.' }
  const dateLabel = formatDate(nextBillingDate)
  if (!dateLabel) return { title: 'Próximo cobro', text: 'La API no proporciona la fecha del próximo cobro.' }
  const days = subscription?.days_remaining ?? daysUntil(nextBillingDate)
  const expired = subscription?.is_expired || (subscription?.status && subscription.status !== 'ACTIVE')
  if (expired) return { title: 'Tu plan venció', text: `Venció el ${dateLabel}. Renuévalo para conservar tu espacio.`, tone: 'danger' }
  if (subscription && subscription.auto_renew === false) {
    return { title: 'Tu plan vence', text: `${dateLabel} · ${daysLabel(days)}. La renovación automática está desactivada.`, days, tone: days <= 5 ? 'warning' : '' }
  }
  return { title: 'Próximo cobro', text: `${dateLabel} · ${daysLabel(days)}`, days }
}

export default function BillingSummary({ usage, currentPlan, subscription, nextBillingDate, onViewPlans }) {
  const percent = getUsagePercent(usage)
  const percentText = formatUsagePercent(percent)
  const price = Number(currentPlan?.monthly_price ?? usage?.plan_precio_mensual ?? 0)
  const nextCharge = getNextCharge({ price, subscription, nextBillingDate })

  return <div className="billing-summary">
    <div className="billing-summary-grid">
      <section className="billing-card usage-card">
        <h2>Almacenamiento utilizado</h2>
        <div className="usage-card__body">
          <div className="usage-donut" style={{ '--usage-percent': `${getVisualPercent(percent)}%` }} role="img" aria-label={`${percentText} del almacenamiento utilizado`}>
            <div className="usage-donut__center"><strong className={percentText.length > 4 ? 'is-long' : ''}>{percentText}</strong><span>usado</span></div>
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

    <section className={`next-charge-card${nextCharge.tone ? ` is-${nextCharge.tone}` : ''}`}>
      <div className="next-charge-card__icon"><BillingIcon name="clock" size={25} /></div>
      <div className="next-charge-card__details"><strong>{nextCharge.title}</strong><span>{nextCharge.text}</span></div>
      <strong className="next-charge-card__amount">{price > 0 ? formatMoney(price) : 'Q0.00 GTQ'}</strong>
    </section>

    <div className="billing-summary__footer"><span>Plan actual: <strong>{currentPlan?.name || usage?.plan_nombre || '—'}</strong></span><button className="billing-button billing-button--secondary" type="button" onClick={onViewPlans}>Ver planes</button></div>
  </div>
}
