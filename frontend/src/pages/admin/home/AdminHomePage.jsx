import { useEffect, useState } from 'react'
import { getProfile } from '../../../api/auth'
import '../plans/AdminPlansPage.css'
import './AdminHomePage.css'

function displayName(profile) {
  return [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.email || 'Administrador'
}

/** Inicio del administrador: quién está conectado y un resumen del sistema. */
export default function AdminHomePage() {
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    let active = true
    getProfile().then((data) => { if (active) setProfile(data) }).catch(() => {})
    return () => { active = false }
  }, [])

  return <main className="admin-page admin-home">
    <header className="admin-header">
      <div>
        <span className="admin-header__crumb">Administración</span>
        <h1>Hola, {profile ? displayName(profile) : '…'}</h1>
        <p className="admin-home__identity">
          {/* Si no tiene nombre, el correo ya aparece en el saludo y no se repite. */}
          {profile?.email && displayName(profile) !== profile.email && <span>{profile.email}</span>}
          <span className="admin-home__role">Cuenta de administrador</span>
        </p>
      </div>
    </header>

    <div className="admin-content">
    </div>
  </main>
}
