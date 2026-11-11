import { useEffect, useState } from 'react'
import BillingIcon from './BillingIcon'

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function formatDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

function formatMoney(value) {
  return `Q${Number(value || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getStatus(status) {
  if (status === 'APPROVED') return { label: 'Pagado', className: 'is-paid' }
  if (status === 'PENDING') return { label: 'Pendiente', className: 'is-pending' }
  return { label: 'Rechazado', className: 'is-failed' }
}

function getReference(payment) {
  return payment.transaction_reference || `PAGO-${payment.id}`
}

function getShortReference(payment) {
  return payment.transaction_reference ? `#${payment.transaction_reference.replace(/^MOCK-/i, '')}` : `#${payment.id}`
}

const PAYMENT_TYPES = { SUBSCRIPTION: 'Contratación de plan', RENEWAL: 'Renovación' }
const PAYMENT_METHODS = { MOCK_CARD: 'Tarjeta (pasarela simulada)' }

function PaymentDetail({ payment, onClose }) {
  const [copied, setCopied] = useState(false)
  const status = getStatus(payment.status)

  useEffect(() => {
    function onKey(event) { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(getReference(payment))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  const rows = [
    ['Fecha', formatDateTime(payment.created_at)],
    ['Plan', payment.plan_name || 'Plan'],
    ['Concepto', PAYMENT_TYPES[payment.payment_type] || payment.payment_type || 'Pago'],
    ['Método', PAYMENT_METHODS[payment.payment_method] || payment.payment_method || 'Tarjeta'],
  ]

  return <div className="payment-detail-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="payment-detail" role="dialog" aria-modal="true" aria-labelledby="payment-detail-title">
      <button type="button" className="payment-detail__close" onClick={onClose} aria-label="Cerrar"><BillingIcon name="close" size={18} /></button>
      <div className={`payment-detail__badge ${status.className}`}><BillingIcon name={payment.status === 'APPROVED' ? 'check' : 'close'} size={26} /></div>
      <h2 id="payment-detail-title">Detalle del pago</h2>
      <p className="payment-detail__amount">{formatMoney(payment.amount)}</p>
      <span className={`payment-status ${status.className}`}>{status.label}</span>
      <dl className="payment-detail__rows">
        {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        <div><dt>Referencia</dt><dd className="payment-detail__reference"><code>{getReference(payment)}</code><button type="button" onClick={copyReference}>{copied ? 'Copiada' : 'Copiar'}</button></dd></div>
        {payment.status !== 'APPROVED' && payment.failure_reason && <div className="is-failure"><dt>Motivo</dt><dd>{payment.failure_reason}</dd></div>}
      </dl>
      <button type="button" className="payment-detail__done" onClick={onClose}>Cerrar</button>
    </section>
  </div>
}

export default function BillingHistory({ history, loading }) {
  const [selected, setSelected] = useState(null)

  if (loading && !history.length) return <div className="billing-empty">Cargando historial…</div>
  if (!history.length) return <div className="billing-empty"><BillingIcon name="document" size={34} /><h2>Aún no hay pagos</h2><p>Cuando contrates o renueves un plan, aparecerá aquí.</p></div>

  return <>
    <div className="history-table-wrap"><table className="history-table">
      <thead><tr><th>Factura</th><th>Fecha</th><th>Plan</th><th>Monto</th><th>Estado</th><th><span className="visually-hidden">Acciones</span></th></tr></thead>
      <tbody>{history.map((payment) => {
        const status = getStatus(payment.status)
        return <tr key={payment.id}>
          <td><button type="button" className="history-reference" onClick={() => setSelected(payment)} title="Ver detalle del pago">{getShortReference(payment)}</button></td>
          <td data-label="Fecha">{formatDate(payment.created_at)}</td>
          <td data-label="Plan">{payment.plan_name || 'Plan'}</td>
          <td data-label="Monto">{formatMoney(payment.amount)}</td>
          <td data-label="Estado"><span className={`payment-status ${status.className}`}>{status.label}</span></td>
          <td className="history-actions"><button type="button" className="history-detail-button" onClick={() => setSelected(payment)}>Ver detalle</button></td>
        </tr>
      })}</tbody>
    </table></div>
    {selected && <PaymentDetail payment={selected} onClose={() => setSelected(null)} />}
  </>
}
