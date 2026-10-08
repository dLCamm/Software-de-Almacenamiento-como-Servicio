import BillingIcon from './BillingIcon'

function formatMoney(value) {
  return `Q${Number(value || 0).toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function formatStorage(gigabytes) {
  return `${Number(gigabytes || 0).toLocaleString('es-GT')} GB de almacenamiento`
}

export default function BillingPlans({ plans, currentPlan, selectedPlanId, loading, onSelectPlan, onContinue }) {
  const selectedPlan = plans.find((plan) => String(plan.id) === String(selectedPlanId))
  const alreadyFreePlan = selectedPlan?.slug === 'free' && currentPlan?.slug === 'free'

  return <section className="plans-section" aria-label="Planes disponibles">
    {loading && !plans.length ? <div className="billing-empty">Cargando planes…</div> : !plans.length ? <div className="billing-empty">No se pudieron cargar los planes disponibles.</div> : <>
      <div className="plan-cards">
        {plans.map((plan) => {
          const selected = String(plan.id) === String(selectedPlanId)
          const isCurrent = String(plan.id) === String(currentPlan?.id)
          return <article key={plan.id} className={`plan-card${selected ? ' is-selected' : ''}${plan.slug === 'business' ? ' plan-card--business' : ''}`}>
            {plan.is_popular && <span className="plan-card__popular">Popular</span>}
            <button type="button" className="plan-card__select" onClick={() => onSelectPlan(plan)} aria-pressed={selected} aria-label={`Seleccionar plan ${plan.name}`}>
              <span className={`plan-card__name plan-card__name--${plan.slug}`}>{plan.name}</span>
              <span className="plan-card__price"><strong>{formatMoney(plan.price)}</strong><span>/mes</span></span>
              <span className="plan-card__storage">{formatStorage(plan.storage_gb)}</span>
              <span className="plan-card__benefits">{(plan.benefits || []).slice().sort((a, b) => a.order - b.order).map((benefit) => <span key={benefit.id}><BillingIcon name="check" size={18} />{benefit.description}</span>)}</span>
              {selected && <span className="plan-card__selected"><BillingIcon name="check" size={18} />{isCurrent ? 'Plan actual seleccionado' : 'Plan seleccionado'}</span>}
            </button>
          </article>
        })}
      </div>
      <button className="billing-button billing-button--primary plans-continue" type="button" onClick={onContinue} disabled={!selectedPlan || loading || alreadyFreePlan}>
        <BillingIcon name="card" />{alreadyFreePlan ? 'Ya tienes el plan FREE' : `Continuar con ${selectedPlan?.name || 'el plan'}`}
      </button>
    </>}
  </section>
}
