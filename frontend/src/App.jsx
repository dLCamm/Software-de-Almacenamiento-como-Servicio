import { useState } from 'react'
import { register } from './services/auth.js'
import './App.css'

const initialRegistration = { firstName: '', lastName: '', email: '', password: '', passwordConfirm: '', termsAccepted: false }
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Icon({ name, size = 20 }) {
  const icons = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    folder: <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" />,
    card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.7 2.7 0 0 1 5.1 1.2c0 1.8-2.6 2.1-2.6 3.8M12 17h.01" /></>,
    shield: <><path d="M12 3 20 6v5c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V6z" /><path d="M9 12h6M12 9v6" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-3v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.6-1H5.2v-3h.2A1.7 1.7 0 0 0 7 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h3v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.1 2.1-.1.1A1.7 1.7 0 0 0 19 10a1.7 1.7 0 0 0 1.6 1h.2v3h-.2a1.7 1.7 0 0 0-1.4 1z" /></>,
    logout: <><path d="M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5M15 8l4 4-4 4M19 12H9" /></>,
    cloud: <><path d="M7.5 18.5h9a4.5 4.5 0 0 0 .6-8.9A5.8 5.8 0 0 0 6.2 8 4.6 4.6 0 0 0 7.5 18.5Z" /><path d="M12 10v5M9.8 12.2 12 10l2.2 2.2" /></>,
    user: <><circle cx="12" cy="8" r="3.2" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
    check: <path d="m5 12 4.2 4.2L19 6.5" />,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  }
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>
}

function BrandLogo({ compact = false }) {
  return <div className={`brand-logo-slot${compact ? ' compact' : ''}`} role="img" aria-label="Espacio reservado para el logotipo de Kubo"><Icon name="cloud" size={compact ? 23 : 31} /><span>{compact ? 'Kubo' : 'Logo Kubo'}</span></div>
}

function Sidebar() {
  const items = [['dashboard', 'Dashboard'], ['folder', 'Mis Archivos'], ['card', 'Planes y Facturación'], ['help', 'Soporte Técnico'], ['shield', 'Administrador'], ['settings', 'Configuración']]
  return <aside className="sidebar">
    <BrandLogo compact />
    <nav className="side-navigation" aria-label="Navegación principal">{items.map(([icon, label]) => <a href={`#${label.toLowerCase().replaceAll(' ', '-')}`} key={label}><Icon name={icon} /><span>{label}</span></a>)}</nav>
    <section className="storage-card" aria-label="Uso de almacenamiento"><div className="storage-title"><Icon name="cloud" size={17} /><span>Almacenamiento</span></div><div className="storage-amount"><strong>0 GB</strong><span> de 5 GB usados</span></div><div className="storage-progress"><span /></div><p>5 GB disponibles</p></section>
    <a className="logout-link" href="#cerrar-sesion"><Icon name="logout" /><span>Cerrar sesión</span></a>
  </aside>
}

function AccountSwitcher({ currentView, onNavigate }) {
  return <nav className="account-switcher" aria-label="Navegación de cuenta"><a href="#login">Iniciar sesión</a><button type="button" className={currentView === 'register' ? 'active' : ''} onClick={() => onNavigate('register')}>Registrarse</button><button type="button" className={currentView === 'recovery' ? 'active' : ''} onClick={() => onNavigate('recovery')}>Recuperar cuenta</button><a href="#perfil"><Icon name="user" size={17} /><span>Mi perfil</span></a></nav>
}

function getRegistrationErrors(values) {
  const errors = {}
  if (!values.firstName.trim()) errors.firstName = 'Ingresa tu nombre.'
  if (!values.lastName.trim()) errors.lastName = 'Ingresa tu apellido.'
  if (!values.email.trim()) errors.email = 'Ingresa tu correo electrónico.'
  else if (!emailPattern.test(values.email)) errors.email = 'Ingresa un correo electrónico válido.'
  if (!values.password) errors.password = 'Ingresa una contraseña.'
  else if (values.password.length < 8 || !/[A-Z]/.test(values.password) || !/(?:[0-9]|[^A-Za-z0-9\s])/.test(values.password)) errors.password = 'Usa al menos 8 caracteres, una mayúscula y un número o símbolo.'
  if (!values.passwordConfirm) errors.passwordConfirm = 'Confirma tu contraseña.'
  else if (values.password !== values.passwordConfirm) errors.passwordConfirm = 'Las contraseñas no coinciden.'
  if (!values.termsAccepted) errors.termsAccepted = 'Debes aceptar los términos para crear tu cuenta.'
  return errors
}

function Field({ label, name, type = 'text', value, error, onChange, autoComplete }) {
  return <label className="form-field"><span>{label}</span><input name={name} type={type} value={value} onChange={onChange} autoComplete={autoComplete} placeholder={label} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} />{error && <small className="field-error" id={`${name}-error`}>{error}</small>}</label>
}

function PasswordRules({ password }) {
  const rules = [[password.length >= 8, 'Mínimo 8 caracteres'], [/[A-Z]/.test(password), 'Una letra mayúscula'], [/(?:[0-9]|[^A-Za-z0-9\s])/.test(password), 'Un número o símbolo']]
  return <ul className="password-rules" aria-label="Requisitos de la contraseña">{rules.map(([met, label]) => <li className={met ? 'met' : ''} key={label}><Icon name="check" size={14} />{label}</li>)}</ul>
}

function FormNotice({ status, notice }) {
  if (!notice) return null
  return <p className={`form-notice ${status}`} role={status === 'error' ? 'alert' : 'status'}>{status === 'success' && <Icon name="check" size={17} />}{notice}</p>
}

function RegistrationForm() {
  const [values, setValues] = useState(initialRegistration)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [notice, setNotice] = useState('')
  function updateValue(event) { const { name, value, checked, type } = event.target; setValues((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value })); setErrors((current) => ({ ...current, [name]: undefined })); setStatus('idle') }
  async function handleSubmit(event) {
    event.preventDefault()
    if (status === 'loading') return
    const validationErrors = getRegistrationErrors(values)
    if (Object.keys(validationErrors).length) { setErrors(validationErrors); setNotice('Revisa los campos marcados antes de continuar.'); setStatus('error'); return }
    setStatus('loading'); setNotice(''); setErrors({})
    try {
      await register({ first_name: values.firstName.trim(), last_name: values.lastName.trim(), email: values.email.trim(), password: values.password, password_confirm: values.passwordConfirm })
      setStatus('success'); setNotice('Tu cuenta fue creada correctamente.'); setValues(initialRegistration)
    } catch (error) { setStatus('error'); setNotice(error.message); setErrors(error.fields ?? {}) }
  }
  return <section className="form-card" aria-labelledby="register-title"><div className="form-heading"><span className="eyebrow">EMPIEZA HOY</span><h2 id="register-title">Crear cuenta</h2><p>Completa tus datos para disfrutar de tu espacio en la nube.</p></div><form onSubmit={handleSubmit} noValidate><div className="field-row"><Field label="Nombre" name="firstName" value={values.firstName} error={errors.firstName} onChange={updateValue} autoComplete="given-name" /><Field label="Apellido" name="lastName" value={values.lastName} error={errors.lastName} onChange={updateValue} autoComplete="family-name" /></div><Field label="Correo electrónico" name="email" type="email" value={values.email} error={errors.email} onChange={updateValue} autoComplete="email" /><Field label="Contraseña" name="password" type="password" value={values.password} error={errors.password} onChange={updateValue} autoComplete="new-password" /><PasswordRules password={values.password} /><Field label="Confirmar contraseña" name="passwordConfirm" type="password" value={values.passwordConfirm} error={errors.passwordConfirm} onChange={updateValue} autoComplete="new-password" /><label className={`terms-field${errors.termsAccepted ? ' has-error' : ''}`}><input name="termsAccepted" type="checkbox" checked={values.termsAccepted} onChange={updateValue} /><span>Acepto los <a href="#terminos">Términos de Servicio</a> y la <a href="#privacidad">Política de Privacidad</a>.</span></label>{errors.termsAccepted && <p className="field-error">{errors.termsAccepted}</p>}<FormNotice status={status} notice={notice} /><button className="primary-button" type="submit" disabled={status === 'loading'}>{status === 'loading' ? <><span className="spinner" />Creando cuenta...</> : <>Crear cuenta <Icon name="arrow" size={18} /></>}</button></form></section>
}

function RecoveryForm() {
  const [email, setEmail] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [status, setStatus] = useState('idle')
  function handleSubmit(event) { event.preventDefault(); if (!email.trim() || !emailPattern.test(email)) { setError('Ingresa un correo electrónico válido.'); setNotice(''); setStatus('error'); return }; setError(''); setStatus('error'); setNotice('La recuperación de contraseña no está disponible todavía: la API actual no publica un endpoint para solicitar ni reenviar enlaces de recuperación.') }
  return <section className="form-card recovery-card" aria-labelledby="recovery-title"><div className="form-heading"><span className="eyebrow">ACCESO A TU CUENTA</span><h2 id="recovery-title">Recuperar cuenta</h2><p>Introduce tu correo electrónico para recibir un enlace de recuperación.</p></div><form onSubmit={handleSubmit} noValidate><Field label="Correo electrónico" name="recoveryEmail" type="email" value={email} error={error} onChange={(event) => { setEmail(event.target.value); setError(''); setNotice(''); setStatus('idle') }} autoComplete="email" /><FormNotice status={status} notice={notice} /><button className="primary-button" type="submit">Enviar enlace de recuperación <Icon name="arrow" size={18} /></button></form><div className="recovery-info"><h3>¿No recibiste el correo?</h3><ul><li>Revisa tu carpeta de correo no deseado o spam.</li><li>La expiración del enlace se configurará cuando exista el servicio en la API.</li></ul><button className="text-button" type="button" disabled title="El backend no ofrece reenvío de correo">Reenviar correo</button></div><a className="back-link" href="#login"><span aria-hidden="true">←</span> Volver al login</a></section>
}

function App() {
  const [currentView, setCurrentView] = useState('register')
  return <div className="app-shell"><Sidebar /><main className="content"><header className="topbar" aria-label="Barra superior" /><div className="content-inner"><header className="product-header"><BrandLogo /><h1>Kubo</h1><p>Tu almacenamiento en la nube</p></header><AccountSwitcher currentView={currentView} onNavigate={setCurrentView} />{currentView === 'register' ? <RegistrationForm /> : <RecoveryForm />}</div></main></div>
}

export default App
