import { useState } from 'react'
import { MailIcon, LockIcon } from '../../components/icons'
import FormField from './FormField'
import { login } from '../../api/auth'

export default function LoginForm({ onSwitchTab, onAuthenticated }) {
  const [form, setForm] = useState({ email: '', password: '', remember: false })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function validate() {
    const next = {}
    if (!form.email.trim()) next.email = 'Ingresa tu correo electrónico.'
    if (!form.password) next.password = 'Ingresa tu contraseña.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (!validate()) return

    setLoading(true)
    try {
      // login() ya guarda el access/refresh token en localStorage.
      const data = await login({ email: form.email, password: form.password })
      onAuthenticated?.(data)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-panel">
      <h2>Bienvenido de nuevo</h2>
      <p className="auth-panel__subtitle">Ingresa tus credenciales para acceder</p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <FormField
          icon={MailIcon}
          placeholder="correo@ejemplo.com"
          autoComplete="email"
          value={form.email}
          error={errors.email}
          onChange={(e) => updateField('email', e.target.value)}
        />
        <FormField
          icon={LockIcon}
          isPassword
          placeholder="Contraseña"
          autoComplete="current-password"
          value={form.password}
          error={errors.password}
          onChange={(e) => updateField('password', e.target.value)}
        />

        <div className="auth-form__row">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.remember}
              onChange={(e) => updateField('remember', e.target.checked)}
            />
            Recordarme
          </label>
          <button
            type="button"
            className="link-button"
            onClick={() => onSwitchTab('recover')}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        {formError && <p className="auth-form__error">{formError}</p>}

        <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
          {loading ? 'Ingresando…' : 'Iniciar sesión'}
        </button>

        <p className="auth-panel__footer">
          ¿No tienes cuenta?{' '}
          <button type="button" className="link-button" onClick={() => onSwitchTab('register')}>
            Regístrate gratis
          </button>
        </p>
      </form>
    </div>
  )
}
