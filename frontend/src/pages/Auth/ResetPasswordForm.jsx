import { useState } from 'react'
import { LockIcon } from '../../components/icons'
import { clearTokens, confirmPasswordReset } from '../../api/auth'
import FormField from './FormField'

export default function ResetPasswordForm({ uid, token, onCompleted, onRequestNew }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const missingLink = !uid || !token

  async function handleSubmit(event) {
    event.preventDefault()
    if (loading || missingLink) return
    setError('')
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    try {
      const result = await confirmPasswordReset({ uid, token, password, confirmPassword })
      clearTokens()
      onCompleted(result.detail)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-panel">
      <h2>Nueva contraseña</h2>
      <p className="auth-panel__subtitle">Usa al menos 8 caracteres. Evita contraseñas comunes, solo números o similares a tus datos personales.</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <FormField icon={LockIcon} isPassword aria-label="Nueva contraseña" placeholder="Nueva contraseña"
          autoComplete="new-password" required minLength={8} value={password} disabled={loading || missingLink}
          onChange={(event) => setPassword(event.target.value)} />
        <FormField icon={LockIcon} isPassword aria-label="Confirmar nueva contraseña" placeholder="Confirmar nueva contraseña"
          autoComplete="new-password" required minLength={8} value={confirmPassword} disabled={loading || missingLink}
          onChange={(event) => setConfirmPassword(event.target.value)} />
        {(missingLink || error) && (
          <p className="auth-form__error" role="alert">{missingLink ? 'El enlace está incompleto. Solicita uno nuevo.' : error}</p>
        )}
        <button type="submit" className="btn btn--primary btn--block" disabled={loading || missingLink}>
          {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
        </button>
      </form>
      <button type="button" className="link-button back-link" disabled={loading} onClick={onRequestNew}>
        Solicitar otro enlace de recuperación
      </button>
    </div>
  )
}
