import { useState } from 'react'
import { verifyEmail } from '../../api/auth'

export default function VerifyEmailForm({ uid, token, onCompleted, onRequestNew }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const missingLink = !uid || !token

  async function handleVerify() {
    if (loading || missingLink) return
    setLoading(true)
    setError('')
    try {
      const result = await verifyEmail({ uid, token })
      onCompleted(result.detail)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-panel">
      <h2>Confirma tu correo</h2>
      <p className="auth-panel__subtitle">Confirma tu dirección de correo para empezar a usar Kubo.</p>
      {(missingLink || error) && (
        <p className="auth-form__error" role="alert">{missingLink ? 'El enlace está incompleto. Solicita uno nuevo.' : error}</p>
      )}
      <button type="button" className="btn btn--primary btn--block" disabled={loading || missingLink} onClick={handleVerify}>
        {loading ? 'Verificando…' : 'Verificar correo'}
      </button>
      <button type="button" className="link-button back-link" disabled={loading} onClick={onRequestNew}>
        Solicitar un nuevo enlace
      </button>
    </div>
  )
}
