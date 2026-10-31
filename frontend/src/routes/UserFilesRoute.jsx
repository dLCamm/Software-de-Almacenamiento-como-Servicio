import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getProfile } from '../api/auth'

/**
 * "Mis Archivos" es solo para clientes y soporte. El administrador no tiene unidad propia,
 * así que si entra a /app/client lo mandamos a su panel de Administración.
 */
export default function UserFilesRoute({ children }) {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let active = true
    getProfile()
      .then((profile) => { if (active) setStatus(profile?.role === 'ADMIN' ? 'admin' : 'allowed') })
      // Si no se pudo leer el perfil dejamos pasar; la propia página muestra el error.
      .catch(() => { if (active) setStatus('allowed') })
    return () => { active = false }
  }, [])

  if (status === 'checking') return null
  if (status === 'admin') return <Navigate to="/app/admin" replace />
  return children
}
