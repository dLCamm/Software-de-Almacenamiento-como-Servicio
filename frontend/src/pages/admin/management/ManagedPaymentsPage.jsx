import { useEffect, useState } from 'react'
import { listManagedPayments } from '../../../api/management'
import { AdminIcon } from '../plans/AdminIcon'
import ManagementPaymentsTable from './ManagementPaymentsTable'
import TablePagination from '../shared/TablePagination'
import usePagedList from '../shared/usePagedList'
import '../plans/AdminPlansPage.css'
import './ManagementPage.css'

const initialFilters = { search: '', plan: '', status: '', payment_type: '', date_from: '', date_to: '' }

export default function ManagedPaymentsPage() {
  const [form, setForm] = useState(initialFilters)
  const [filters, setFilters] = useState({})
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const paged = usePagedList(payments, 10)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    listManagedPayments(filters)
      .then((data) => { if (active) setPayments(Array.isArray(data) ? data : data?.results || []) })
      .catch((loadError) => { if (active) setError(loadError.message || 'No se pudo cargar el historial de pagos.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters])

  function changeField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function applyFilters(event) {
    event.preventDefault()
    paged.resetPage()
    setFilters(Object.fromEntries(Object.entries(form).filter(([, value]) => value !== '')))
  }

  function clearFilters() {
    setForm(initialFilters)
    paged.resetPage()
    setFilters({})
  }

  return <main className="admin-page">
    <header className="admin-header"><div><span className="admin-header__crumb">Administración</span><h1>Historial global de pagos</h1><p>{loading ? 'Cargando transacciones…' : `${payments.length} ${payments.length === 1 ? 'transacción' : 'transacciones'}`}</p></div></header>
    <div className="admin-content">
      {error && <div className="admin-alert admin-alert--error" role="alert"><span>{error}</span></div>}
      <form className="management-filters management-payment-filters" onSubmit={applyFilters}>
        <label className="admin-field management-search"><span>Buscar</span><input name="search" value={form.search} onChange={changeField} placeholder="Usuario, correo o referencia" /></label>
        <label className="admin-field"><span>Plan</span><select name="plan" value={form.plan} onChange={changeField}><option value="">Todos</option><option value="free">Free</option><option value="pro">Pro</option><option value="business">Business</option><option value="premium">Premium</option></select></label>
        <label className="admin-field"><span>Estado</span><select name="status" value={form.status} onChange={changeField}><option value="">Todos</option><option value="APPROVED">Aprobado</option><option value="REJECTED">Rechazado</option></select></label>
        <label className="admin-field"><span>Tipo de pago</span><select name="payment_type" value={form.payment_type} onChange={changeField}><option value="">Todos</option><option value="SUBSCRIPTION">Suscripción</option><option value="RENEWAL">Renovación</option></select></label>
        <label className="admin-field"><span>Desde</span><input type="date" name="date_from" value={form.date_from} onChange={changeField} /></label>
        <label className="admin-field"><span>Hasta</span><input type="date" name="date_to" value={form.date_to} onChange={changeField} /></label>
        <div className="management-filter-actions"><button className="admin-button admin-button--primary" type="submit">Filtrar</button><button className="admin-button admin-button--secondary" type="button" onClick={clearFilters}>Limpiar</button></div>
      </form>

      {loading && !payments.length
        ? <div className="admin-empty"><span className="admin-spinner" />Cargando pagos…</div>
        : !payments.length
          ? <div className="admin-empty"><AdminIcon name="layers" size={34} /><h2>No hay pagos para mostrar</h2><p>Ajusta los filtros para buscar otras transacciones.</p></div>
          : <><ManagementPaymentsTable payments={paged.pageItems} /><TablePagination page={paged.page} pageSize={paged.pageSize} total={paged.total} onPageChange={paged.setPage} onPageSizeChange={paged.setPageSize} label="Paginación de pagos" /></>}
    </div>
  </main>
}
