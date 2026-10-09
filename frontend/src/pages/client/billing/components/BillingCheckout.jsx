import { formatBytes } from '../../dashboard/formatters'
import BillingIcon from './BillingIcon'

const PAYMENT_METHODS = [
  { id: 'CARD', title: 'Tarjeta de crédito/débito', detail: 'Visa, Mastercard, AMEX', enabled: true },
  { id: 'TRANSFER', title: 'Transferencia bancaria', detail: 'Transferencia ACH o depósito', enabled: false },
]

function formatMoney(value) {
  return `Q${Number(value || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ`
}

function formatDate(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

function StepProgress({ step }) {
  const activeStep = Math.min(step, 3)
  const labels = ['Seleccionar método', 'Datos de pago', 'Confirmar']
  return <div className="checkout-progress" aria-label={`Paso ${activeStep} de 3`}>
    {labels.map((label, index) => {
      const number = index + 1
      return <div className={`checkout-progress__step${number <= activeStep ? ' is-active' : ''}`} key={label}>
        <span className="checkout-progress__circle">{number < activeStep ? <BillingIcon name="check" size={17} /> : number}</span>
        {number < labels.length && <span className={`checkout-progress__line${number < activeStep ? ' is-active' : ''}`} />}
        {number === activeStep && <span className="checkout-progress__label">{label}</span>}
      </div>
    })}
  </div>
}

function CardForm({ card, onUpdate, onContinue, onBack }) {
  function updateNumber(value) {
    const digits = value.replace(/\D/g, '').slice(0, 16)
    onUpdate('number', digits.match(/.{1,4}/g)?.join(' ') ?? '')
  }

  function updateExpiry(value) {
    const digits = value.replace(/\D/g, '').slice(0, 4)
    onUpdate('expiry', digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits)
  }

  return <form className="billing-payment-form" onSubmit={onContinue}>
    <h2>Datos de la tarjeta</h2>
    <p>Los datos se envían directamente a la API de pagos y no se guardan en el navegador.</p>
    <label>Número de tarjeta<input autoComplete="cc-number" inputMode="numeric" value={card.number} onChange={(event) => updateNumber(event.target.value)} placeholder="0000 0000 0000 0000" maxLength={19} required /></label>
    <div className="billing-payment-form__row">
      <label>Vencimiento<input autoComplete="cc-exp" inputMode="numeric" value={card.expiry} onChange={(event) => updateExpiry(event.target.value)} placeholder="MM/AA" maxLength={5} required /></label>
      <label>CVV<input autoComplete="cc-csc" inputMode="numeric" value={card.cvv} onChange={(event) => onUpdate('cvv', event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="123" maxLength={4} required /></label>
    </div>
    <div className="billing-secure-note"><BillingIcon name="lock" size={17} />Pago de prueba procesado por la API configurada.</div>
    <div className="checkout-actions"><button className="billing-button billing-button--secondary" type="button" onClick={onBack}>Atrás</button><button className="billing-button billing-button--primary" type="submit">Continuar</button></div>
  </form>
}

export default function BillingCheckout({
  selectedPlan,
  currentPlan,
  isRenewal,
  step,
  paymentMethod,
  onChooseMethod,
  card,
  onUpdateCard,
  lastFour,
  result,
  nextBillingDate,
  loading,
  onContinue,
  onBack,
  onConfirm,
  onReset,
  onViewHistory,
  onViewPlans,
}) {
  if (!selectedPlan) return <div className="billing-empty"><p>Primero selecciona un plan para continuar.</p></div>
  if (currentPlan?.slug === 'free' && selectedPlan.slug === 'free' && step !== 4) return <div className="billing-empty"><p>Tu plan FREE no requiere pago. Elige otro plan para iniciar una contratación.</p><button className="billing-button billing-button--secondary" type="button" onClick={onViewPlans}>Ver planes</button></div>

  const price = Number(selectedPlan.price || 0)
  const maskedCard = lastFour ? `•••• •••• •••• ${lastFour}` : 'Tarjeta terminada en —'
  const newEndDate = formatDate(result?.new_end_date || result?.end_date || nextBillingDate)

  if (step === 4) return <section className="checkout-success">
    <div className="checkout-success__icon"><BillingIcon name="check" size={33} /></div>
    <h2>¡Operación completada!</h2>
    <p>{result?.detail || 'Tu plan se actualizó correctamente.'}</p>
    <div className="checkout-success__reference"><span>Referencia</span><strong>{result?.transaction_reference || 'No proporcionada'}</strong></div>
    <div className="checkout-success__reference"><span>Monto</span><strong>{formatMoney(result?.amount ?? price)}</strong></div>
    {newEndDate && <div className="checkout-success__reference"><span>Vigente hasta</span><strong>{newEndDate}</strong></div>}
    <div className="checkout-actions"><button className="billing-button billing-button--secondary" type="button" onClick={onViewHistory}>Ver historial</button><button className="billing-button billing-button--primary" type="button" onClick={onReset}>Volver al resumen</button></div>
  </section>

  return <section className="checkout-section">
    <StepProgress step={step} />
    {step === 1 && <div className="checkout-methods">
      <h2>Método de pago</h2>
      {PAYMENT_METHODS.map((method) => <button key={method.id} type="button" className={`payment-method${paymentMethod === method.id ? ' is-selected' : ''}${!method.enabled ? ' is-unavailable' : ''}`} onClick={() => onChooseMethod(method.id)} aria-pressed={paymentMethod === method.id} disabled={!method.enabled}>
        <span className="payment-method__radio" />
        <span className="payment-method__icon"><BillingIcon name="card" size={24} /></span>
        <span className="payment-method__details"><strong>{method.title}</strong><span>{method.detail}</span></span>
        {!method.enabled && <span className="payment-method__badge">No disponible</span>}
      </button>)}
      <p className="billing-footnote">El contrato actual de la API solo procesa pagos con tarjeta; las otras opciones aparecen deshabilitadas.</p>
      <button className="billing-button billing-button--primary checkout-full-button" type="button" onClick={onContinue}>Continuar</button>
    </div>}

    {step === 2 && <CardForm card={card} onUpdate={onUpdateCard} onContinue={onContinue} onBack={onBack} />}

    {step === 3 && <div className="checkout-review">
      <h2>Resumen del pedido</h2>
      <div className="checkout-review__card">
        <div><span>Plan</span><strong>{selectedPlan.name} — {formatStorage(selectedPlan.storage_gb)}</strong></div>
        <div><span>Ciclo</span><strong>Mensual</strong></div>
        <div><span>{isRenewal ? 'Renovar con' : 'Tarjeta'}</span><strong>{maskedCard}</strong></div>
        <div className="checkout-review__total"><span>Total</span><strong>{formatMoney(price)}</strong></div>
      </div>
      <div className="checkout-actions"><button className="billing-button billing-button--secondary" type="button" onClick={onBack} disabled={loading}>Atrás</button><button className="billing-button billing-button--primary" type="button" onClick={onConfirm} disabled={loading}>{loading ? 'Procesando…' : 'Confirmar pago'}</button></div>
    </div>}
  </section>
}

function formatStorage(gigabytes) {
  const size = Number(gigabytes || 0)
  return size >= 1024 ? `${formatBytes(size * 1024 ** 3)}` : `${size} GB`
}
