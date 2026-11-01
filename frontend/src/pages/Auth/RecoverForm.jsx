import { useState } from 'react'
import { MailIcon } from '../../components/icons'
import FormField from './FormField'
import { requestPasswordReset, resendVerification } from '../../api/auth'

export default function RecoverForm({ onGoToLogin, verification = false, initialEmail = '' }) {
  const [email, setEmail] = useState(initialEmail)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [sent, setSent] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setSent('')
    if (loading) return

    if (!email.trim()) {
      setError('Ingresa tu correo electrónico.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Ingresa un correo electrónico válido.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const send = verification ? resendVerification : requestPasswordReset
      const result = await send({ email: email.trim() })
      setSent(result.detail)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-panel">
      <h2>{verification ? 'Verificar tu correo' : 'Recuperar cuenta'}</h2>
      <p className="auth-panel__subtitle">
        {verification
          ? 'Ingresa tu correo para solicitar un nuevo enlace de verificación.'
          : 'Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.'}
      </p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <FormField
          icon={MailIcon}
          type="email"
          aria-label="Correo electrónico"
          placeholder="correo@ejemplo.com"
          autoComplete="email"
          value={email}
          error={error}
          disabled={loading}
          onChange={(e) => { setEmail(e.target.value); setSent(''); setError('') }}
        />

        {formError && <p className="auth-form__error" role="alert">{formError}</p>}
        {sent && <p className="auth-form__success" role="status">{sent}</p>}

        <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
          {loading ? 'Enviando…' : verification ? 'Enviar enlace de verificación' : 'Enviar enlace de recuperación'}
        </button>
      </form>

      <div className="recover-help">
        <p>¿No recibiste el correo?</p>
        <ul>
          <li>Revisa tu carpeta de spam</li>
          <li>El enlace tiene un tiempo limitado; revisa la vigencia indicada en el correo</li>
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

      <button type="button" className="link-button back-link" onClick={onGoToLogin}>
        ← Volver a iniciar sesión
      </button>
    </div>
  )
}
