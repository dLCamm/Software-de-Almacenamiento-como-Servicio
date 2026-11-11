import { useEffect, useState } from 'react'
import { getProfile } from '../../../api/auth'

/** Texto pequeño sobre el título: "Soporte técnico" para el perfil de soporte y "Administración" para el admin. */
export default function AdminCrumb() {
  const [role, setRole] = useState('')

  useEffect(() => {
    let active = true
    getProfile().then((profile) => { if (active) setRole(profile?.role || '') }).catch(() => {})
    return () => { active = false }
  }, [])

  const isSupport = role === 'SUPPORT'
  return <span className={`admin-header__crumb admin-crumb${isSupport ? ' is-support' : ''}`}>
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {isSupport
        ? <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="13" width="4" height="6" rx="1.5" /><rect x="17" y="13" width="4" height="6" rx="1.5" /></>
        : <path d="M12 3 5 6v5.5c0 4.3 3 8.1 7 9.5 4-1.4 7-5.2 7-9.5V6z" />}
    </svg>
    {isSupport ? 'Soporte técnico' : 'Administración'}
  </span>
}
