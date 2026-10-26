import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getManagedPayment } from '../../../api/management'
import { AdminIcon } from '../plans/AdminIcon'
import '../plans/AdminPlansPage.css'
import './ManagementPage.css'

function formatMoney(value) {
  return `Q${Number(value || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('es-GT', { dateStyle: 'full', timeStyle: 'short' })
}

export default function PaymentDetailDialog({ paymentId, onClose }) {
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getManagedPayment(paymentId)
      .then((data) => { if (active) setPayment(data) })
      .catch((loadError) => { if (active) setError(loadError.message || 'No se pudo cargar el detalle de la transacción.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [paymentId])

  const customerName = [payment?.user?.first_name, payment?.user?.last_name].filter(Boolean).join(' ') || payment?.user?.email || '—'

  return <div className="admin-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="admin-dialog management-payment-dialog" role="dialog" aria-modal="true" aria-labelledby="payment-detail-title">
      <header className="admin-dialog__header"><div><span className="management-card__eyebrow">Transacción #{paymentId}</span><h2 id="payment-detail-title">Detalle del pago</h2></div><button className="admin-icon-button" type="button" onClick={onClose} aria-label="Cerrar"><AdminIcon name="x" /></button></header>
      <div className="admin-dialog__body">
        {loading && <div className="admin-empty management-inline-empty"><span className="admin-spinner" />Cargando transacción…</div>}
        {!loading && error && <div className="admin-alert admin-alert--error" role="alert">{error}</div>}
        {!loading && payment && <>
          <div className="management-payment-summary"><strong>{formatMoney(payment.amount)}</strong><span className={`management-badge ${payment.status === 'APPROVED' ? 'is-success' : payment.status === 'REJECTED' ? 'is-danger' : 'is-muted'}`}>{payment.status}</span></div>
          <dl className="management-data-list management-payment-data">
            <div><dt>Usuario</dt><dd><Link className="management-table-link" to={`/app/admin/usuarios/${payment.user?.id}`} onClick={onClose}>{customerName}</Link></dd></div>
            <div><dt>Correo</dt><dd>{payment.user?.email || '—'}</dd></div>
            <div><dt>Rol</dt><dd>{payment.user?.role || '—'}</dd></div>
            <div><dt>Plan</dt><dd>{payment.plan?.name || payment.plan?.code || '—'}</dd></div>
            <div><dt>Tipo</dt><dd>{payment.payment_type === 'RENEWAL' ? 'Renovación' : 'Suscripción'}</dd></div>
            <div><dt>Método de pago</dt><dd>{payment.payment_method || '—'}</dd></div>
            <div><dt>Referencia</dt><dd><code>{payment.transaction_reference || '—'}</code></dd></div>
            <div><dt>Fecha</dt><dd>{formatDate(payment.created_at)}</dd></div>
            {payment.failure_reason && <div className="management-payment-failure"><dt>Motivo del rechazo</dt><dd>{payment.failure_reason}</dd></div>}
          </dl>
        </>}
      </div>
    </section>
  </div>
}
