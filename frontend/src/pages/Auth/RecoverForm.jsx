import { useState } from 'react'
import { MailIcon } from '../../components/icons'
import FormField from './FormField'
import { requestPasswordReset } from '../../api/auth'

// El backend todavía no expone /api/auth/password-reset/ (ver users/urls.py),
// así que este formulario mostrará el error de red hasta que se agregue esa
// vista en el backend. La UI ya queda lista para conectarse ese día.
export default function RecoverForm({ onSwitchTab }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')

    if (!email.trim()) {
      setError('Ingresa tu correo electrónico.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await requestPasswordReset({ email })
      setSent(true)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-panel">
      <h2>Recuperar cuenta</h2>
      <p className="auth-panel__subtitle">
        Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
      </p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <FormField
          icon={MailIcon}
          placeholder="correo@ejemplo.com"
          autoComplete="email"
          value={email}
          error={error}
          onChange={(e) => setEmail(e.target.value)}
        />

        {formError && <p className="auth-form__error">{formError}</p>}

        <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
          {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
        </button>
      </form>

      <div className="recover-help">
        <p>¿No recibiste el correo?</p>
        <ul>
          <li>Revisa tu carpeta de spam</li>
          <li>El enlace expira en 30 minutos</li>
          <li>
            <button
              type="button"
              className="link-button"
              disabled={!sent || loading}
              onClick={handleSubmit}
            >
              Reenviar correo
            </button>
          </li>
        </ul>
      </div>

      <button type="button" className="link-button back-link" onClick={() => onSwitchTab('login')}>
        ← Volver al login
      </button>
    </div>
  )
}
