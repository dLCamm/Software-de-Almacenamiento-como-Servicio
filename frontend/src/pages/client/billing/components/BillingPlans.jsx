import BillingIcon from './BillingIcon'

function formatMoney(value) {
  return `Q${Number(value || 0).toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function formatStorage(gigabytes) {
  return `${Number(gigabytes || 0).toLocaleString('es-GT')} GB de almacenamiento`
}

// Funciones que dependen del plan. Las que el plan no incluye se muestran tachadas para comparar.
const PLAN_FEATURES = { share_links: 'Compartir enlaces', temporary_files: 'Archivos temporales' }

/** Beneficios informativos (sin repetir el almacenamiento) + funciones de pago que el plan no incluye. */
function getPlanRows(plan) {
  const storageText = formatStorage(plan.storage_limit_gb).toLowerCase()
  const included = (plan.benefits || []).slice().sort((a, b) => a.order - b.order)
    .filter((benefit) => benefit.description?.trim().toLowerCase() !== storageText)
    .map((benefit) => ({ key: benefit.id, text: benefit.description, included: true }))
  const missing = Object.entries(PLAN_FEATURES)
    .filter(([code]) => !plan.features?.[code])
    .map(([code, text]) => ({ key: code, text, included: false }))
  return [...included, ...missing]
}

// Texto y estado del botón de cada tarjeta según la relación con el plan actual.
function getAction(plan, isCurrent) {
  if (isCurrent && plan.code === 'free') return { label: 'Tu plan actual', disabled: true }
  if (isCurrent) return { label: 'Renovar plan', disabled: false }
  if (plan.code === 'free') return { label: 'Cambiar a Free', disabled: false }
  return { label: 'Contratar', disabled: false }
}

function PlanSkeletonGrid() {
  return <div className="plan-cards plan-cards--skeleton" role="status" aria-label="Cargando planes" aria-busy="true">
    {Array.from({ length: 4 }, (_, index) => <article key={index} className="plan-card plan-card--skeleton" aria-hidden="true">
      <div className="plan-card__body">
        <div className="plan-skeleton__head">
          <span className="plan-skeleton__shape plan-skeleton__name" />
          <span className="plan-skeleton__shape plan-skeleton__badge" />
        </div>
        <span className="plan-skeleton__shape plan-skeleton__price" />
        <span className="plan-skeleton__shape plan-skeleton__storage" />
        <div className="plan-skeleton__benefits">
          {[0, 1, 2, 3].map((line) => <span key={line} className={`plan-skeleton__shape plan-skeleton__benefit plan-skeleton__benefit--${line + 1}`} />)}
        </div>
        <span className="plan-skeleton__shape plan-skeleton__action" />
      </div>
    </article>)}
  </div>
}

export default function BillingPlans({ plans, currentPlan, loading, onContract }) {
  return <section className="plans-section" aria-label="Planes disponibles">
    {loading && !plans.length ? <PlanSkeletonGrid /> : !plans.length ? <div className="billing-empty">No se pudieron cargar los planes disponibles.</div> :
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
              <span className="plan-card__benefits">{getPlanRows(plan).map((row) => <span key={row.key} className={row.included ? undefined : 'is-missing'}><BillingIcon name={row.included ? 'check' : 'minus'} size={18} />{row.included ? row.text : <><s>{row.text}</s><span className="visually-hidden"> (no incluido)</span></>}</span>)}</span>
              <button
                type="button"
                className={`billing-button plan-card__action ${isCurrent || plan.code === 'free' ? 'billing-button--secondary' : 'billing-button--primary'}`}
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
