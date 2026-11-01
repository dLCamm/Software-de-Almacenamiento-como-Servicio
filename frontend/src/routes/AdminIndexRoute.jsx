import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getProfile } from '../api/auth'

/** /app/admin: el administrador va a su Inicio; soporte, a la lista de usuarios. */
export default function AdminIndexRoute() {
  const [target, setTarget] = useState(null)

  useEffect(() => {
    let active = true
    getProfile()
      .then((profile) => { if (active) setTarget(profile?.role === 'ADMIN' ? '/app/admin/inicio' : '/app/admin/usuarios') })
      .catch(() => { if (active) setTarget('/app/admin/usuarios') })
    return () => { active = false }
  }, [])

  return target ? <Navigate to={target} replace /> : null
}
