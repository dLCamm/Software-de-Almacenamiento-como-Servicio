import BillingIcon from './BillingIcon'

function formatMoney(value) {
  return `Q${Number(value || 0).toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function formatStorage(gigabytes) {
  return `${Number(gigabytes || 0).toLocaleString('es-GT')} GB de almacenamiento`
}

// Texto y estado del botón de cada tarjeta según la relación con el plan actual.
function getAction(plan, isCurrent) {
  if (isCurrent && plan.code === 'free') return { label: 'Tu plan actual', disabled: true }
  if (isCurrent) return { label: 'Renovar plan', disabled: false }
  return { label: 'Contratar', disabled: false }
}

export default function BillingPlans({ plans, currentPlan, loading, onContract }) {
  return <section className="plans-section" aria-label="Planes disponibles">
    {loading && !plans.length ? <div className="billing-empty">Cargando planes…</div> : !plans.length ? <div className="billing-empty">No se pudieron cargar los planes disponibles.</div> :
      <div className="plan-cards">
        {plans.map((plan) => {
          const isCurrent = String(plan.id) === String(currentPlan?.id)
          const action = getAction(plan, isCurrent)
          return <article key={plan.id} className={`plan-card${isCurrent ? ' is-current' : ''}${plan.code === 'business' ? ' plan-card--business' : ''}`}>
            {plan.is_popular && <span className="plan-card__popular">Popular</span>}
            <div className="plan-card__body">
              <div className="plan-card__head">
                <span className={`plan-card__name plan-card__name--${plan.code}`}>{plan.name}</span>
                {isCurrent && <span className="plan-card__current"><BillingIcon name="check" size={14} />Plan actual</span>}
              </div>
              <span className="plan-card__price"><strong>{formatMoney(plan.monthly_price)}</strong><span>/mes</span></span>
              <span className="plan-card__storage">{formatStorage(plan.storage_limit_gb)}</span>
              <span className="plan-card__benefits">{(plan.benefits || []).slice().sort((a, b) => a.order - b.order).map((benefit) => <span key={benefit.id}><BillingIcon name="check" size={18} />{benefit.description}</span>)}</span>
              <button
                type="button"
                className={`billing-button plan-card__action ${isCurrent ? 'billing-button--secondary' : 'billing-button--primary'}`}
                onClick={() => onContract(plan)}
                disabled={action.disabled || loading}
                aria-label={`${action.label} ${plan.name}`}
              >
                {!action.disabled && <BillingIcon name="card" size={18} />}{action.label}
              </button>
            </div>
          </article>
        })}
      </div>}
  </section>
}
