import BillingIcon from './BillingIcon'

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function formatMoney(value) {
  return `Q${Number(value || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getStatus(status) {
  if (status === 'APPROVED') return { label: 'Pagado', className: 'is-paid' }
  if (status === 'PENDING') return { label: 'Pendiente', className: 'is-pending' }
  return { label: 'Fallido', className: 'is-failed' }
}

export default function BillingHistory({ history, loading }) {
  if (loading && !history.length) return <div className="billing-empty">Cargando historial…</div>
  if (!history.length) return <div className="billing-empty"><BillingIcon name="document" size={34} /><h2>Aún no hay pagos</h2><p>Cuando contrates o renueves un plan, aparecerá aquí.</p></div>

  return <div className="history-table-wrap"><table className="history-table">
    <thead><tr><th>Factura</th><th>Fecha</th><th>Plan</th><th>Monto</th><th>Estado</th></tr></thead>
    <tbody>{history.map((payment) => {
      const status = getStatus(payment.status)
      return <tr key={payment.id}>
        <td><span className="history-reference">{payment.transaction_reference || `#${payment.id}`}</span></td>
        <td>{formatDate(payment.created_at)}</td>
        <td>{payment.plan_name || 'Plan'}</td>
        <td>{formatMoney(payment.amount)}</td>
        <td><span className={`payment-status ${status.className}`}>{status.label}</span></td>
      </tr>
    })}</tbody>
  </table></div>
}
