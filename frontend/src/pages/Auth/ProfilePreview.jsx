import { LockIcon } from '../../components/icons'

// El mockup muestra "Mi perfil" como una pestaña más del panel de auth,
// pero su contenido depende de tener sesión iniciada. Mientras no haya
// un usuario autenticado, mostramos este estado y lo mandamos a loguearse.
export default function ProfilePreview({ onSwitchTab }) {
  return (
    <div className="auth-panel auth-panel--centered">
      <div className="profile-locked__icon">
        <LockIcon />
      </div>
      <h2>Inicia sesión para ver tu perfil</h2>
      <p className="auth-panel__subtitle">
        Tu nombre, plan y almacenamiento usado aparecerán aquí una vez que
        inicies sesión.
      </p>
      <button type="button" className="btn btn--primary" onClick={() => onSwitchTab('login')}>
        Iniciar sesión
      </button>
    </div>
  )
}
