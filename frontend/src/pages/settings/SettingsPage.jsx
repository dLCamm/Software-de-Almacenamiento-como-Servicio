import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { changePassword, getProfile, logout, updateProfile } from '../../api/auth'
import useTheme, { setTheme } from '../../theme/useTheme'
import './SettingsPage.css'

const ROLE_LABELS = { CLIENT: 'Cliente', SUPPORT: 'Soporte', ADMIN: 'Administrador' }
const EMPTY_PASSWORDS = { currentPassword: '', password: '', confirmPassword: '' }

function Feedback({ error, notice }) {
  return <>
    {error && <p className="settings-message settings-message--error" role="alert">{error}</p>}
    {notice && <p className="settings-message settings-message--success" role="status">{notice}</p>}
  </>
}

function ProfileForm({ profile, onSaved }) {
  const [form, setForm] = useState({ first_name: profile.first_name || '', last_name: profile.last_name || '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const changes = Object.fromEntries(Object.entries(form)
    .map(([key, value]) => [key, value.trim()])
    .filter(([key, value]) => value !== (profile[key] || '')))
  const hasChanges = Object.keys(changes).length > 0

  function edit(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    setError('')
    setNotice('')
  }

  async function submit(event) {
    event.preventDefault()
    if (saving || !hasChanges) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await updateProfile(changes)
      setForm({ first_name: result.user.first_name, last_name: result.user.last_name })
      onSaved(result.user)
      setNotice(result.detail)
    } catch (saveError) {
      setError(saveError.message || 'No se pudieron guardar tus datos.')
    } finally {
      setSaving(false)
    }
  }

  return <section className="settings-card" aria-labelledby="settings-profile-title">
    <div className="settings-card__heading"><span className="settings-eyebrow">Tu cuenta</span><h2 id="settings-profile-title">Datos personales</h2><p>Actualiza cómo aparece tu nombre en Kubo.</p></div>
    <form onSubmit={submit} aria-busy={saving}>
      <div className="settings-fields">
        <label className="settings-field"><span>Nombre</span><input name="first_name" autoComplete="given-name" value={form.first_name} onChange={edit} maxLength={150} disabled={saving} /></label>
        <label className="settings-field"><span>Apellido</span><input name="last_name" autoComplete="family-name" value={form.last_name} onChange={edit} maxLength={150} disabled={saving} /></label>
      </div>
      <dl className="settings-account-details">
        <div><dt>Correo electrónico</dt><dd>{profile.email}<span className="settings-badge">{profile.is_email_verified ? 'Verificado' : 'Sin verificar'}</span></dd></div>
        <div><dt>Tipo de cuenta</dt><dd>{ROLE_LABELS[profile.role] || profile.role}</dd></div>
      </dl>
      <Feedback error={error} notice={notice} />
      <div className="settings-actions">
        <button type="button" className="settings-button settings-button--secondary" disabled={saving || !hasChanges} onClick={() => { setForm({ first_name: profile.first_name || '', last_name: profile.last_name || '' }); setError(''); setNotice('') }}>Descartar cambios</button>
        <button type="submit" className="settings-button settings-button--primary" disabled={saving || !hasChanges}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
      </div>
    </form>
  </section>
}

function PasswordForm({ onChanged }) {
  const [form, setForm] = useState(EMPTY_PASSWORDS)
  const [saving, setSaving] = useState(false)
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')

  function edit(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    setError('')
  }

  async function submit(event) {
    event.preventDefault()
    if (saving) return
    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas nuevas no coinciden.')
      return
    }
    if (form.password === form.currentPassword) {
      setError('La nueva contraseña debe ser diferente de la actual.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await changePassword(form)
      setForm(EMPTY_PASSWORDS)
      onChanged(result.detail)
    } catch (saveError) {
      setError(saveError.message || 'No se pudo cambiar la contraseña.')
      setSaving(false)
    }
  }

  return <section className="settings-card" aria-labelledby="settings-security-title">
    <div className="settings-card__heading"><span className="settings-eyebrow">Seguridad</span><h2 id="settings-security-title">Cambiar contraseña</h2><p>Al guardar, se cerrarán tus sesiones y tendrás que iniciar sesión con la nueva contraseña.</p></div>
    <form onSubmit={submit} aria-busy={saving}>
      <div className="settings-fields settings-fields--stacked">
        <label className="settings-field"><span>Contraseña actual</span><input name="currentPassword" type={visible ? 'text' : 'password'} autoComplete="current-password" value={form.currentPassword} onChange={edit} required disabled={saving} /></label>
        <label className="settings-field"><span>Nueva contraseña</span><input name="password" type={visible ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={edit} minLength={8} aria-describedby="settings-password-help" required disabled={saving} /></label>
        <label className="settings-field"><span>Confirmar nueva contraseña</span><input name="confirmPassword" type={visible ? 'text' : 'password'} autoComplete="new-password" value={form.confirmPassword} onChange={edit} minLength={8} required disabled={saving} /></label>
      </div>
      <p className="settings-help" id="settings-password-help">Usa al menos 8 caracteres. Evita contraseñas comunes, solo números o similares a tus datos personales.</p>
      <label className="settings-checkbox"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} disabled={saving} />Mostrar contraseñas</label>
      <Feedback error={error} />
      <div className="settings-actions"><button type="submit" className="settings-button settings-button--primary" disabled={saving}>{saving ? 'Actualizando…' : 'Actualizar contraseña'}</button></div>
    </form>
  </section>
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const { theme } = useTheme()

  useEffect(() => {
    let active = true
    getProfile()
      .then((user) => { if (active) setProfile(user) })
      .catch((loadError) => { if (active) setError(loadError.message || 'No se pudo cargar tu cuenta.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refreshKey])

  function passwordChanged(message) {
    logout()
    navigate('/login', { replace: true, state: { notice: message } })
  }

  return <main className="settings-page">
    <header className="settings-header"><span className="settings-eyebrow">Preferencias de tu cuenta</span><h1>Configuración</h1><p>Administra tus datos personales, seguridad y apariencia.</p></header>
    <div className="settings-content">
      {loading ? <div className="settings-loading" role="status">Cargando configuración…</div> : error ? <section className="settings-card"><Feedback error={error} /><div className="settings-actions"><Link to="/login" className="settings-button settings-button--secondary">Iniciar sesión</Link><button className="settings-button settings-button--primary" type="button" onClick={() => { setError(''); setLoading(true); setRefreshKey((value) => value + 1) }}>Reintentar</button></div></section> : profile && <div className="settings-grid">
        <div className="settings-column">
          <ProfileForm profile={profile} onSaved={setProfile} />
          <section className="settings-card" aria-labelledby="settings-theme-title">
            <div className="settings-card__heading"><span className="settings-eyebrow">Personalización</span><h2 id="settings-theme-title">Apariencia</h2><p>Elige el tema que prefieras. Se recuerda en este navegador.</p></div>
            <div className="settings-theme-options" role="group" aria-label="Tema de la aplicación">
              <button className={`settings-theme-option ${theme === 'light' ? 'is-selected' : ''}`} type="button" aria-pressed={theme === 'light'} onClick={() => setTheme('light')}><span aria-hidden="true">☀</span>Claro{theme === 'light' && <small>Seleccionado</small>}</button>
              <button className={`settings-theme-option ${theme === 'dark' ? 'is-selected' : ''}`} type="button" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}><span aria-hidden="true">☾</span>Oscuro{theme === 'dark' && <small>Seleccionado</small>}</button>
            </div>
          </section>
        </div>
        <PasswordForm onChanged={passwordChanged} />
      </div>}
    </div>
  </main>
}
