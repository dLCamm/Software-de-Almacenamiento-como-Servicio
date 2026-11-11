import { useMemo, useState } from 'react'
import { MailIcon, LockIcon, UserIcon, CheckDotIcon } from '../../components/icons'
import FormField from './FormField'
import { register } from '../../api/auth'
import LegalDialog from './LegalDialog'

const REQUIREMENTS = [
  { id: 'length', label: 'Mínimo 8 caracteres', test: (v) => v.length >= 8 },
  { id: 'upper', label: 'Una letra mayúscula', test: (v) => /[A-Z]/.test(v) },
  { id: 'symbol', label: 'Un número o símbolo', test: (v) => /[0-9!@#$%^&*_-]/.test(v) },
]

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  planCode: 'free',
  acceptedTerms: false,
}

// Toda cuenta nueva inicia con FREE; el cambio de plan se hace después en Planes y Facturación.
export default function RegisterForm({ onSwitchTab, onResendVerification }) {
  const [form, setForm] = useState(initialForm)
  const [legalDoc, setLegalDoc] = useState(null)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [registration, setRegistration] = useState(null)
  const [loading, setLoading] = useState(false)

  const requirementResults = useMemo(
    () => REQUIREMENTS.map((r) => ({ ...r, met: r.test(form.password) })),
    [form.password],
  )

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function validate() {
    const next = {}
    if (!form.firstName.trim()) next.firstName = 'Ingresa tu nombre.'
    if (!form.lastName.trim()) next.lastName = 'Ingresa tu apellido.'
    if (!form.email.trim()) next.email = 'Ingresa tu correo electrónico.'
    if (!requirementResults.every((r) => r.met)) {
      next.password = 'La contraseña no cumple los requisitos.'
    }
    if (form.confirmPassword !== form.password) {
      next.confirmPassword = 'Las contraseñas no coinciden.'
    }
    if (!form.acceptedTerms) {
      next.acceptedTerms = 'Debes aceptar los términos para continuar.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (!validate()) return

    setLoading(true)
    try {
      const result = await register(form)
      setRegistration(result)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (registration) {
    return (
      <div className="auth-panel">
        <h2>Cuenta creada</h2>
        <p className="auth-panel__subtitle">
          {registration.detail}
        </p>
        <p className="auth-panel__subtitle">Revisa la bandeja de entrada y spam de {registration.email}.</p>
        {registration.pending_plan && (
          <p className="auth-panel__subtitle">
            Solicitaste {registration.pending_plan.name}. Se activará únicamente después de confirmar el pago; mientras tanto conservas los 5 GB del plan FREE.
          </p>
        )}
        <button type="button" className="btn btn--primary btn--block" onClick={() => onSwitchTab('login')}>
          Ir a iniciar sesión
        </button>
        <button type="button" className="link-button back-link" onClick={() => onResendVerification(registration.email)}>
          Reenviar correo de verificación
        </button>
      </div>
    )
  }

  return (
    <div className="auth-panel">
      <h2>Crear cuenta</h2>
      <p className="auth-panel__subtitle">Completa el formulario para comenzar</p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-form__grid">
          <FormField
            icon={UserIcon}
            placeholder="Nombre"
            autoComplete="given-name"
            value={form.firstName}
            error={errors.firstName}
            onChange={(e) => updateField('firstName', e.target.value)}
          />
          <FormField
            placeholder="Apellido"
            autoComplete="family-name"
            value={form.lastName}
            error={errors.lastName}
            onChange={(e) => updateField('lastName', e.target.value)}
          />
        </div>

        <FormField
          icon={MailIcon}
          type="email"
          aria-label="Correo electrónico"
          placeholder="Correo electrónico"
          autoComplete="email"
          value={form.email}
          error={errors.email}
          onChange={(e) => updateField('email', e.target.value)}
        />
        <FormField
          icon={LockIcon}
          isPassword
          placeholder="Contraseña"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => updateField('password', e.target.value)}
        />
        <FormField
          icon={LockIcon}
          isPassword
          placeholder="Confirmar contraseña"
          autoComplete="new-password"
          value={form.confirmPassword}
          error={errors.confirmPassword}
          onChange={(e) => updateField('confirmPassword', e.target.value)}
        />

        <ul className="requirements">
          {requirementResults.map((req) => (
            <li key={req.id} className={req.met ? 'is-met' : ''}>
              <CheckDotIcon />
              {req.label}
            </li>
          ))}
        </ul>
        {errors.password && <p className="auth-form__error">{errors.password}</p>}

        <label className="checkbox checkbox--terms">
          <input
            type="checkbox"
            checked={form.acceptedTerms}
            onChange={(e) => updateField('acceptedTerms', e.target.checked)}
          />
          <span>
            Acepto los <button type="button" className="terms-link" onClick={() => setLegalDoc('terminos')}>Términos de Servicio</button> y la{' '}
            <button type="button" className="terms-link" onClick={() => setLegalDoc('privacidad')}>Política de Privacidad</button>
          </span>
        </label>
        {errors.acceptedTerms && <p className="auth-form__error">{errors.acceptedTerms}</p>}

        {formError && <p className="auth-form__error">{formError}</p>}

        <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
          {loading ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>
      {legalDoc && <LegalDialog type={legalDoc} onClose={() => setLegalDoc(null)} />}
    </div>
  )
}
