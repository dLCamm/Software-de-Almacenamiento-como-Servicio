import { useEffect, useState } from 'react'
import { updateManagedUser } from '../../../api/management'
import '../plans/AdminPlansPage.css'
import './ManagementPage.css'

const editableFields = ['first_name', 'last_name', 'email', 'role']

function userForm(user) {
  return Object.fromEntries(editableFields.map((field) => [field, user?.[field] ?? '']))
}

export default function UserEditDialog({ user, onClose, onSaved }) {
  const [form, setForm] = useState(() => userForm(user))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(userForm(user))
    setError('')
  }, [user])

  function changeField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    const changes = Object.fromEntries(editableFields
      .map((field) => [field, field === 'role' ? form[field] : form[field].trim()])
      .filter(([field, value]) => value !== (user?.[field] ?? '')))

    if (!Object.keys(changes).length) {
      setError('No hay cambios para guardar.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await updateManagedUser(user.id, changes)
      await onSaved?.()
      onClose()
    } catch (saveError) {
      setError(saveError.message || 'No se pudo actualizar el usuario.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="admin-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose() }}>
    <section className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="managed-user-edit-title">
      <header className="admin-dialog__header"><h2 id="managed-user-edit-title">Editar usuario</h2><button className="admin-icon-button" type="button" onClick={onClose} disabled={saving} aria-label="Cerrar">×</button></header>
      <form onSubmit={submit}>
        <div className="admin-dialog__body">
          <div className="admin-form-grid">
            <label className="admin-field"><span>Nombre</span><input name="first_name" value={form.first_name} onChange={changeField} autoComplete="given-name" /></label>
            <label className="admin-field"><span>Apellido</span><input name="last_name" value={form.last_name} onChange={changeField} autoComplete="family-name" /></label>
            <label className="admin-field"><span>Correo electrónico</span><input name="email" type="email" value={form.email} onChange={changeField} autoComplete="email" /></label>
            <label className="admin-field"><span>Rol</span><select name="role" value={form.role} onChange={changeField}><option value="CLIENT">Cliente</option><option value="SUPPORT">Soporte</option><option value="ADMIN">Administrador</option></select></label>
          </div>
          {error && <div className="admin-alert admin-alert--error" role="alert">{error}</div>}
        </div>
        <footer className="admin-dialog__footer"><button className="admin-button admin-button--secondary" type="button" onClick={onClose} disabled={saving}>Cancelar</button><button className="admin-button admin-button--primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button></footer>
      </form>
    </section>
  </div>
}
