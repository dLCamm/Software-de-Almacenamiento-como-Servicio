import { Navigate, useNavigate, useParams } from 'react-router-dom'
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

// Cada sección tiene su dirección: /app/client/billing, /billing/planes, /billing/pago, /billing/historial.
// Se navega entre ellas desde la barra lateral (layouts/ClientLayout.jsx).
const SECTIONS = [
  { id: 'summary', slug: '', label: 'Resumen' },
  { id: 'plans', slug: 'planes', label: 'Planes' },
  { id: 'payment', slug: 'pago', label: 'Método de pago' },
  { id: 'history', slug: 'historial', label: 'Historial' },
]
const BASE_PATH = '/app/client/billing'

function formatMonthlyPrice(value) {
  const price = Number(value || 0)
  return price === 0 ? 'Gratis' : `Q${price.toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}/mes`
}

export default function BillingPage() {
  const navigate = useNavigate()
  const { section: slug = '' } = useParams()
  const section = SECTIONS.find((item) => item.slug === slug)
  const billing = useBilling({
    billingApi, accountApi, storageApi,
    activeTab: section?.id ?? 'summary',
    onChangeTab: (id) => {
      const next = SECTIONS.find((item) => item.id === id)
      navigate(next?.slug ? `${BASE_PATH}/${next.slug}` : BASE_PATH)
    },
  })
  const planName = billing.currentPlan?.name || billing.usage?.plan_nombre || '—'
  const planPrice = billing.currentPlan?.monthly_price ?? billing.usage?.plan_precio_mensual ?? 0

  if (!section) return <Navigate to={BASE_PATH} replace />

  return <main className="billing-page">
    <header className="billing-header">
      <div><span className="billing-header__crumb">Planes y Facturación</span><h1>{section.label}</h1><p>Plan actual: <strong>{planName} — {formatMonthlyPrice(planPrice)}</strong></p></div>
      <button className="billing-back-button" type="button" onClick={() => navigate('/app/client')}><BillingIcon name="arrow" size={18} />Volver a mi unidad</button>
    </header>

    <div className="billing-content">
      {billing.error && <div className="billing-alert billing-alert--error" role="alert"><span>{billing.error}</span><button type="button" onClick={billing.dismissMessages} aria-label="Cerrar mensaje"><BillingIcon name="close" size={17} /></button></div>}
      {billing.notice && billing.checkoutStep !== 4 && <div className="billing-alert billing-alert--success" role="status"><span>{billing.notice}</span><button type="button" onClick={billing.dismissMessages} aria-label="Cerrar mensaje"><BillingIcon name="close" size={17} /></button></div>}
      {billing.loading && !(billing.activeTab === 'plans' && !billing.plans.length) && <div className="billing-loading" role="status"><span className="billing-spinner" />Actualizando datos de facturación…</div>}

      <div className="billing-panel">
        {billing.activeTab === 'summary' && <BillingSummary usage={billing.usage} currentPlan={billing.currentPlan} subscription={billing.subscription} nextBillingDate={billing.nextBillingDate} onViewPlans={() => billing.setActiveTab('plans')} />}
        {billing.activeTab === 'plans' && <BillingPlans plans={billing.plans} currentPlan={billing.currentPlan} selectedPlanId={billing.selectedPlanId} loading={billing.loading} onContract={billing.contractPlan} />}
        {billing.activeTab === 'payment' && <BillingCheckout selectedPlan={billing.selectedPlan} currentPlan={billing.currentPlan} isRenewal={billing.isRenewal} step={billing.checkoutStep} paymentMethod={billing.paymentMethod} onChooseMethod={billing.choosePaymentMethod} card={billing.card} onUpdateCard={billing.updateCard} lastFour={billing.lastFour} result={billing.paymentResult} nextBillingDate={billing.nextBillingDate} loading={billing.loading} onContinue={billing.continueCheckout} onBack={billing.previousCheckoutStep} onConfirm={billing.confirmPayment} onReset={billing.resetCheckout} onViewHistory={() => billing.setActiveTab('history')} onViewPlans={() => billing.setActiveTab('plans')} />}
        {billing.activeTab === 'history' && <BillingHistory history={billing.history} loading={billing.loading} />}
      </div>
    </div>
  </main>
}
