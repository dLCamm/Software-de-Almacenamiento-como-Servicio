import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProfile } from '../../../api/auth'
import { getManagedUser, updateManagedUserStatus } from '../../../api/management'
import { AdminIcon } from '../plans/AdminIcon'
import UserEditDialog from './UserEditDialog'
import '../plans/AdminPlansPage.css'
import './ManagementPage.css'

function formatDate(value) {
  if (!value) return 'Sin fecha de finalización'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatStorage(plan) {
  if (!plan) return 'Sin plan asignado'
  const gigabytes = plan.storage_limit_gb ?? Number(plan.storage_limit_bytes || 0) / (1024 ** 3)
  return `${Number(gigabytes).toLocaleString('es-GT', { maximumFractionDigits: 2 })} GB`
}

function displayName(user) {
  return [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Usuario'
}

export default function ManagedUserDetailPage() {
  const { userId } = useParams()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)
  const [confirmingStatus, setConfirmingStatus] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const data = await getManagedUser(userId)
      setUser(data)
      return data
    } catch (loadError) {
      setError(loadError.message || 'No se pudo cargar la información del usuario.')
      return null
    }
  }, [userId])

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([getManagedUser(userId), getProfile()])
      .then(([userData, profileData]) => {
        if (!active) return
        setUser(userData)
        setProfile(profileData)
        setError('')
      })
      .catch((loadError) => { if (active) setError(loadError.message || 'No se pudo cargar el usuario.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [userId])

  const subscription = user?.subscription
  const canChangeStatus = user && profile && profile.id !== user.id && (
    profile.role === 'ADMIN' || (profile.role === 'SUPPORT' && user.role === 'CLIENT')
  )

  function toggleStatus() {
    setConfirmingStatus(true)
  }

  async function confirmStatusChange() {
    if (!user || changingStatus) return
    const nextStatus = !user.is_active
    setChangingStatus(true)
    setError('')
    setNotice('')
    try {
      const result = await updateManagedUserStatus(user.id, nextStatus)
      setUser((current) => ({ ...current, is_active: result?.user?.is_active ?? nextStatus }))
      setNotice(result?.detail || `Usuario ${nextStatus ? 'activado' : 'desactivado'} correctamente.`)
      setConfirmingStatus(false)
    } catch (statusError) {
      setError(statusError.message || 'No se pudo cambiar el estado de la cuenta.')
      setConfirmingStatus(false)
    } finally {
      setChangingStatus(false)
    }
  }

  return <main className="admin-page">
    <header className="admin-header">
      <div>
        <Link className="admin-header__crumb management-back" to="/app/admin/usuarios"><AdminIcon name="up" size={14} />Usuarios</Link>
        <h1>{user ? displayName(user) : `Usuario #${userId}`}</h1>
        <p>{user?.email || 'Información de la cuenta y su plan'}</p>
      </div>
      <div className="management-header-actions">
        {canChangeStatus && <button className={`admin-button ${user.is_active ? 'admin-button--danger' : 'admin-button--secondary'}`} type="button" onClick={toggleStatus} disabled={changingStatus}>{changingStatus ? 'Actualizando…' : user.is_active ? 'Desactivar cuenta' : 'Activar cuenta'}</button>}
        {profile?.role === 'ADMIN' && user && <button className="admin-button admin-button--primary" type="button" onClick={() => setEditing(true)}><AdminIcon name="edit" />Editar usuario</button>}
      </div>
    </header>

    <div className="admin-content">
      {error && <div className="admin-alert admin-alert--error" role="alert"><span>{error}</span></div>}
      {notice && <div className="admin-alert admin-alert--success" role="status"><span>{notice}</span></div>}
      {loading
        ? <div className="admin-empty"><span className="admin-spinner" />Cargando usuario…</div>
        : user && <>
          <section className="management-detail-grid" aria-label="Información del usuario">
            <article className="management-card management-card--identity">
              <div className="management-avatar" aria-hidden="true">{displayName(user).slice(0, 1).toLocaleUpperCase()}</div>
              <div className="management-card__identity"><h2>{displayName(user)}</h2><p>{user.email}</p><span className={`management-badge ${user.is_active ? 'is-success' : 'is-muted'}`}>{user.is_active ? 'Cuenta activa' : 'Cuenta desactivada'}</span></div>
              <dl className="management-data-list"><div><dt>Rol</dt><dd>{user.role}</dd></div><div><dt>Correo verificado</dt><dd>{user.is_email_verified ? 'Sí' : 'No'}</dd></div><div><dt>Cuenta creada</dt><dd>{formatDate(user.created_at)}</dd></div><div><dt>Última actualización</dt><dd>{formatDate(user.updated_at)}</dd></div></dl>
            </article>

            <article className="management-card">
              <span className="management-card__eyebrow">Plan actual</span>
              <h2>{user.plan?.name || 'Sin plan'}</h2>
              <p className="management-card__code">{user.plan?.code || '—'}</p>
              <dl className="management-data-list"><div><dt>Precio mensual</dt><dd>{user.plan ? `Q${Number(user.plan.monthly_price || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}` : '—'}</dd></div><div><dt>Almacenamiento</dt><dd>{formatStorage(user.plan)}</dd></div><div><dt>Plan disponible</dt><dd>{user.plan ? (user.plan.is_active ? 'Sí' : 'No') : '—'}</dd></div></dl>
            </article>

            <article className="management-card management-card--subscription">
              <span className="management-card__eyebrow">Suscripción</span>
              {subscription ? <>
                <h2>{subscription.status}</h2>
                <dl className="management-data-list"><div><dt>Inicio</dt><dd>{formatDate(subscription.start_date)}</dd></div><div><dt>Finalización</dt><dd>{formatDate(subscription.end_date)}</dd></div><div><dt>Renovación automática</dt><dd>{subscription.auto_renew ? 'Activada' : 'Desactivada'}</dd></div></dl>
              </> : <p className="management-muted">Este usuario no tiene una suscripción registrada.</p>}
            </article>
          </section>
        </>}
    </div>

    {editing && user && <UserEditDialog user={user} onClose={() => setEditing(false)} onSaved={load} />}

    {confirmingStatus && user && <div className="admin-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !changingStatus) setConfirmingStatus(false) }}>
      <div className="admin-dialog admin-dialog--confirm" role="alertdialog" aria-labelledby="status-confirm-title" aria-describedby="status-confirm-text">
        <div className="admin-dialog__body">
          <span className={`admin-confirm-icon${user.is_active ? '' : ' management-status-confirm-icon--activating'}`}><AdminIcon name={user.is_active ? 'x' : 'check'} size={26} /></span>
          <h2 id="status-confirm-title">¿{user.is_active ? 'Desactivar' : 'Activar'} la cuenta de {displayName(user)}?</h2>
          <p id="status-confirm-text">{user.is_active ? 'La persona no podrá iniciar sesión mientras su cuenta esté desactivada. Puedes volver a activarla después.' : 'La persona podrá volver a iniciar sesión con su cuenta.'}</p>
        </div>
        <footer className="admin-dialog__footer">
          <button type="button" className="admin-button admin-button--secondary" onClick={() => setConfirmingStatus(false)} disabled={changingStatus}>Cancelar</button>
          <button type="button" className={`admin-button ${user.is_active ? 'admin-button--danger' : 'admin-button--primary'}`} onClick={confirmStatusChange} disabled={changingStatus}>{changingStatus ? 'Actualizando…' : user.is_active ? 'Desactivar cuenta' : 'Activar cuenta'}</button>
        </footer>
      </div>
    </div>}
  </main>
}
