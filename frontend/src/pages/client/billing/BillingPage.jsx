import { useNavigate } from 'react-router-dom'
import * as accountApi from '../../../api/auth'
import * as billingApi from '../../../api/billing'
import * as storageApi from '../../../api/storage'
import BillingHistory from './components/BillingHistory'
import BillingIcon from './components/BillingIcon'
import BillingPlans from './components/BillingPlans'
import BillingSummary from './components/BillingSummary'
import BillingCheckout from './components/BillingCheckout'
import useBilling from './useBilling'
import './BillingPage.css'

const TABS = [
  { id: 'summary', label: 'Resumen' },
  { id: 'plans', label: 'Planes' },
  { id: 'payment', label: 'Método de pago' },
  { id: 'history', label: 'Historial' },
]

function formatMonthlyPrice(value) {
  const price = Number(value || 0)
  return price === 0 ? 'Gratis' : `Q${price.toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}/mes`
}

export default function BillingPage() {
  const navigate = useNavigate()
  const billing = useBilling({ billingApi, accountApi, storageApi })
  const planName = billing.currentPlan?.name || billing.usage?.plan_nombre || '—'
  const planPrice = billing.currentPlan?.price ?? billing.usage?.plan_precio_mensual ?? 0

  return <main className="billing-page">
    <header className="billing-header">
      <div><h1>Planes y Facturación</h1><p>Plan actual: <strong>{planName} — {formatMonthlyPrice(planPrice)}</strong></p></div>
      <button className="billing-back-button" type="button" onClick={() => navigate('/app/client')}><BillingIcon name="arrow" size={18} />Volver a mi unidad</button>
    </header>

    <div className="billing-content">
      <nav className="billing-tabs" role="tablist" aria-label="Secciones de facturación">
        {TABS.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={billing.activeTab === tab.id} className={billing.activeTab === tab.id ? 'is-active' : ''} onClick={() => billing.setActiveTab(tab.id)}>{tab.label}</button>)}
      </nav>

      {billing.error && <div className="billing-alert billing-alert--error" role="alert"><span>{billing.error}</span><button type="button" onClick={billing.dismissMessages} aria-label="Cerrar mensaje"><BillingIcon name="close" size={17} /></button></div>}
      {billing.notice && billing.checkoutStep !== 4 && <div className="billing-alert billing-alert--success" role="status"><span>{billing.notice}</span><button type="button" onClick={billing.dismissMessages} aria-label="Cerrar mensaje"><BillingIcon name="close" size={17} /></button></div>}
      {billing.loading && <div className="billing-loading" role="status"><span className="billing-spinner" />Actualizando datos de facturación…</div>}

      <div className="billing-panel" role="tabpanel">
        {billing.activeTab === 'summary' && <BillingSummary usage={billing.usage} currentPlan={billing.currentPlan} nextBillingDate={billing.nextBillingDate} onViewPlans={() => billing.setActiveTab('plans')} />}
        {billing.activeTab === 'plans' && <BillingPlans plans={billing.plans} currentPlan={billing.currentPlan} selectedPlanId={billing.selectedPlanId} loading={billing.loading} onContract={billing.contractPlan} />}
        {billing.activeTab === 'payment' && <BillingCheckout selectedPlan={billing.selectedPlan} currentPlan={billing.currentPlan} isRenewal={billing.isRenewal} step={billing.checkoutStep} paymentMethod={billing.paymentMethod} onChooseMethod={billing.choosePaymentMethod} card={billing.card} onUpdateCard={billing.updateCard} lastFour={billing.lastFour} result={billing.paymentResult} nextBillingDate={billing.nextBillingDate} loading={billing.loading} onContinue={billing.continueCheckout} onBack={billing.previousCheckoutStep} onConfirm={billing.confirmPayment} onReset={billing.resetCheckout} onViewHistory={() => billing.setActiveTab('history')} onViewPlans={() => billing.setActiveTab('plans')} />}
        {billing.activeTab === 'history' && <BillingHistory history={billing.history} loading={billing.loading} />}
      </div>
    </div>
  </main>
}
