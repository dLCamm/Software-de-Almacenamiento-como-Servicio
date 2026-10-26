import { Link } from 'react-router-dom'

function formatMoney(value) {
  return `Q${Number(value || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' })
}

function paymentStatusClass(status) {
  if (status === 'APPROVED') return 'is-success'
  if (status === 'REJECTED') return 'is-danger'
  return 'is-muted'
}

export default function ManagementPaymentsTable({ payments, onOpenPayment }) {
  return <div className="admin-table-wrap">
    <table className="admin-table management-payments-table">
      <thead><tr><th>Transacción</th><th>Usuario</th><th>Plan</th><th>Importe</th><th>Tipo</th><th>Estado</th><th>Fecha</th>{onOpenPayment && <th><span className="visually-hidden">Detalle</span></th>}</tr></thead>
      <tbody>{payments.map((payment) => <tr key={payment.id}>
        <td data-label="Transacción"><span className="management-user-name">#{payment.id}</span><small className="management-user-email">{payment.transaction_reference || 'Sin referencia'}</small></td>
        <td data-label="Usuario">{payment.user ? <Link className="management-table-link" to={`/app/admin/usuarios/${payment.user.id}`}>{[payment.user.first_name, payment.user.last_name].filter(Boolean).join(' ') || payment.user.email}<small>{payment.user.email}</small></Link> : '—'}</td>
        <td data-label="Plan">{payment.plan?.name || payment.plan?.code || '—'}</td>
        <td data-label="Importe"><strong className="management-payment-amount">{formatMoney(payment.amount)}</strong></td>
        <td data-label="Tipo">{payment.payment_type === 'RENEWAL' ? 'Renovación' : 'Suscripción'}</td>
        <td data-label="Estado"><span className={`management-badge ${paymentStatusClass(payment.status)}`}>{payment.status}</span></td>
        <td data-label="Fecha">{formatDate(payment.created_at)}</td>
        {onOpenPayment && <td className="admin-actions"><button className="admin-button admin-button--secondary management-detail-button" type="button" onClick={() => onOpenPayment(payment.id)}>Ver detalle</button></td>}
      </tr>)}</tbody>
    </table>
  </div>
}
