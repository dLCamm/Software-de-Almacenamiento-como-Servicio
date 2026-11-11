import { useEffect, useState } from 'react'
import { getManagedUserPayments } from '../../../api/management'
import { AdminIcon } from '../plans/AdminIcon'
import ManagementPaymentsTable from './ManagementPaymentsTable'
import PaymentDetailDialog from './PaymentDetailDialog'
import '../plans/AdminPlansPage.css'
import './ManagementPage.css'

const initialFilters = { status: '', payment_type: '', plan: '' }

export default function ManagedUserPaymentsPanel({ userId }) {
  const [form, setForm] = useState(initialFilters)
  const [filters, setFilters] = useState({})
  const [payments, setPayments] = useState([])
  const [selectedPaymentId, setSelectedPaymentId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getManagedUserPayments(userId, filters)
      .then((data) => { if (active) setPayments(Array.isArray(data?.payments) ? data.payments : []) })
      .catch((loadError) => { if (active) setError(loadError.message || 'No se pudo cargar el historial de pagos.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [userId, filters])

  function changeField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function applyFilters(event) {
    event.preventDefault()
    setFilters(Object.fromEntries(Object.entries(form).filter(([, value]) => value !== '')))
  }

  function clearFilters() {
    setForm(initialFilters)
    setFilters({})
  }

  return <section className="management-user-payments" aria-labelledby="user-payments-title">
    <div className="management-section-heading"><div><span className="management-card__eyebrow">Facturación</span><h2 id="user-payments-title">Historial de pagos</h2></div>{!loading && <span className="management-payment-count">{payments.length} {payments.length === 1 ? 'transacción' : 'transacciones'}</span>}</div>
    <form className="management-filters management-user-payment-filters" onSubmit={applyFilters}>
      <label className="admin-field"><span>Plan</span><select name="plan" value={form.plan} onChange={changeField}><option value="">Todos</option><option value="free">Free</option><option value="pro">Pro</option><option value="business">Business</option><option value="premium">Premium</option></select></label>
      <label className="admin-field"><span>Estado</span><select name="status" value={form.status} onChange={changeField}><option value="">Todos</option><option value="APPROVED">Aprobado</option><option value="REJECTED">Rechazado</option></select></label>
      <label className="admin-field"><span>Tipo de pago</span><select name="payment_type" value={form.payment_type} onChange={changeField}><option value="">Todos</option><option value="SUBSCRIPTION">Suscripción</option><option value="RENEWAL">Renovación</option></select></label>
      <div className="management-filter-actions"><button className="admin-button admin-button--primary" type="submit">Filtrar</button><button className="admin-button admin-button--secondary" type="button" onClick={clearFilters}>Limpiar</button></div>
    </form>
    {error && <div className="admin-alert admin-alert--error" role="alert"><span>{error}</span></div>}
    {loading && !payments.length
      ? <div className="admin-empty management-inline-empty"><span className="admin-spinner" />Cargando historial…</div>
      : !payments.length
        ? <div className="admin-empty management-inline-empty"><AdminIcon name="layers" size={28} /><h2>Sin transacciones</h2><p>No hay pagos que coincidan con los filtros.</p></div>
        : <ManagementPaymentsTable payments={payments} onOpenPayment={setSelectedPaymentId} />}
    {selectedPaymentId && <PaymentDetailDialog paymentId={selectedPaymentId} onClose={() => setSelectedPaymentId(null)} />}
  </section>
}
