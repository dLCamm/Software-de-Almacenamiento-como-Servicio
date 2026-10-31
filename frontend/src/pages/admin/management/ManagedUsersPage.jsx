import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProfile } from '../../../api/auth'
import { listManagedUsers } from '../../../api/management'
import { AdminIcon } from '../plans/AdminIcon'
import TablePagination from '../shared/TablePagination'
import usePagedList from '../shared/usePagedList'
import '../plans/AdminPlansPage.css'
import './ManagementPage.css'

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-GT', { dateStyle: 'medium' })
}

function userName(user) {
  return [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Sin nombre'
}

function planName(plan) {
  return plan?.name || plan?.code || 'Sin plan'
}

export default function ManagedUsersPage() {
  const [profile, setProfile] = useState(null)
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ search: '', plan: '', is_active: '', role: '' })
  const [filters, setFilters] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const paged = usePagedList(users, 10)

  useEffect(() => {
    let active = true
    getProfile().then((data) => { if (active) setProfile(data) }).catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    listManagedUsers(filters)
      .then((data) => { if (active) setUsers(Array.isArray(data) ? data : data?.results || []) })
      .catch((loadError) => { if (active) setError(loadError.message || 'No se pudo cargar la lista de usuarios.') })
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
    setForm({ search: '', plan: '', is_active: '', role: '' })
    paged.resetPage()
    setFilters({})
  }

  return <main className="admin-page">
    <header className="admin-header">
      <div><span className="admin-header__crumb">Administración</span><h1>Gestión de usuarios</h1><p>{loading ? 'Cargando cuentas…' : `${users.length} ${users.length === 1 ? 'cuenta encontrada' : 'cuentas encontradas'}`}</p></div>
    </header>

    <div className="admin-content">
      {error && <div className="admin-alert admin-alert--error" role="alert"><span>{error}</span></div>}
      <form className="management-filters" onSubmit={applyFilters}>
        <label className="admin-field management-search"><span>Buscar usuario</span><input name="search" value={form.search} onChange={changeField} placeholder="Nombre o correo" /></label>
        <label className="admin-field"><span>Plan</span><select name="plan" value={form.plan} onChange={changeField}><option value="">Todos</option><option value="free">Free</option><option value="pro">Pro</option><option value="business">Business</option><option value="premium">Premium</option></select></label>
        <label className="admin-field"><span>Estado</span><select name="is_active" value={form.is_active} onChange={changeField}><option value="">Todos</option><option value="true">Activos</option><option value="false">Desactivados</option></select></label>
        {profile?.role === 'ADMIN' && <label className="admin-field"><span>Rol</span><select name="role" value={form.role} onChange={changeField}><option value="">Todos</option><option value="CLIENT">Cliente</option><option value="SUPPORT">Soporte</option><option value="ADMIN">Administrador</option></select></label>}
        <div className="management-filter-actions"><button className="admin-button admin-button--primary" type="submit">Filtrar</button><button className="admin-button admin-button--secondary" type="button" onClick={clearFilters}>Limpiar</button></div>
      </form>

      {loading && !users.length
        ? <div className="admin-empty"><span className="admin-spinner" />Cargando usuarios…</div>
        : !users.length
          ? <div className="admin-empty"><AdminIcon name="layers" size={34} /><h2>No hay usuarios para mostrar</h2><p>Prueba con otros filtros o una búsqueda diferente.</p></div>
          : <><div className="admin-table-wrap">
            <table className="admin-table management-users-table">
              <thead><tr><th>Usuario</th><th>Rol</th><th>Plan</th><th>Estado</th><th>Registro</th><th><span className="visually-hidden">Detalle</span></th></tr></thead>
              <tbody>{paged.pageItems.map((user) => <tr key={user.id}>
                <td data-label="Usuario"><span className="management-user-name">{userName(user)}</span><small className="management-user-email">{user.email}</small></td>
                <td data-label="Rol">{user.role}</td>
                <td data-label="Plan">{planName(user.plan)}</td>
                <td data-label="Estado"><span className={`management-badge ${user.is_active ? 'is-success' : 'is-muted'}`}>{user.is_active ? 'Activo' : 'Desactivado'}</span></td>
                <td data-label="Registro">{formatDate(user.created_at)}</td>
                <td className="admin-actions"><Link className="admin-button admin-button--secondary management-detail-button" to={`/app/admin/usuarios/${user.id}`}>Ver detalle</Link></td>
              </tr>)}</tbody>
            </table>
          </div>
          <TablePagination page={paged.page} pageSize={paged.pageSize} total={paged.total} onPageChange={paged.setPage} onPageSizeChange={paged.setPageSize} label="Paginación de usuarios" /></>}
    </div>
  </main>
}
