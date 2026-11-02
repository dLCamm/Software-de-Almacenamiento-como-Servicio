import { useEffect, useRef, useState } from 'react'
import { createSupportUser } from '../../../api/management'

const emptyForm = { first_name: '', last_name: '', email: '', password: '', password_confirm: '' }

export default function SupportUserCreateDialog({ onClose, onCreated }) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const firstInput = useRef(null)
  const submitting = useRef(false)

  useEffect(() => {
    const previousFocus = document.activeElement
    firstInput.current?.focus()
    return () => previousFocus?.focus()
  }, [])

  function changeField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
  }

  function handleKeys(event) {
    if (event.key === 'Escape' && !submitting.current) {
      event.preventDefault()
      onClose()
    }
    if (event.key === 'Tab') {
      const fields = event.currentTarget.querySelectorAll('button:not(:disabled), input:not(:disabled)')
      if (!fields.length) {
        event.preventDefault()
        return
      }
      const first = fields[0]
      const last = fields[fields.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
  }

  async function submit(event) {
    event.preventDefault()
    if (submitting.current) return
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('Escribe el nombre y el apellido del usuario de soporte.')
      return
    }
    if (form.password !== form.password_confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    submitting.current = true
    setSaving(true)
    setError('')
    try {
      const result = await createSupportUser({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        password_confirm: form.password_confirm,
      })
      onCreated(result)
    } catch (createError) {
      setError(createError.message || 'No se pudo crear el usuario de soporte.')
      submitting.current = false
      setSaving(false)
    }
  }

  return <div className="admin-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting.current) onClose() }}>
    <section className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="support-create-title" aria-describedby="support-create-description" onKeyDown={handleKeys}>
      <header className="admin-dialog__header">
        <h2 id="support-create-title">Crear usuario de soporte</h2>
        <button className="admin-icon-button" type="button" onClick={onClose} disabled={saving} aria-label="Cerrar">×</button>
      </header>
      <form onSubmit={submit} aria-busy={saving}>
        <div className="admin-dialog__body">
          <p className="management-create-description" id="support-create-description">La cuenta tendrá el rol Soporte y podrá iniciar sesión inmediatamente. Podrá consultar clientes y gestionar su estado.</p>
          <div className="admin-form-grid">
            <label className="admin-field"><span>Nombre</span><input ref={firstInput} name="first_name" value={form.first_name} onChange={changeField} maxLength={150} autoComplete="given-name" required disabled={saving} /></label>
            <label className="admin-field"><span>Apellido</span><input name="last_name" value={form.last_name} onChange={changeField} maxLength={150} autoComplete="family-name" required disabled={saving} /></label>
            <label className="admin-field management-field-wide"><span>Correo electrónico</span><input name="email" type="email" value={form.email} onChange={changeField} maxLength={254} autoComplete="off" required disabled={saving} /></label>
            <label className="admin-field"><span>Contraseña</span><input name="password" type="password" value={form.password} onChange={changeField} minLength={8} autoComplete="new-password" required disabled={saving} /><small>Al menos 8 caracteres. Evita contraseñas comunes o similares al nombre.</small></label>
            <label className="admin-field"><span>Confirmar contraseña</span><input name="password_confirm" type="password" value={form.password_confirm} onChange={changeField} minLength={8} autoComplete="new-password" required disabled={saving} /></label>
          </div>
          {error && <div className="admin-alert admin-alert--error" role="alert">{error}</div>}
        </div>
        <footer className="admin-dialog__footer">
          <button className="admin-button admin-button--secondary" type="button" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="admin-button admin-button--primary" type="submit" disabled={saving}>{saving ? 'Creando…' : 'Crear cuenta'}</button>
        </footer>
      </form>
    </section>
  </div>
}
