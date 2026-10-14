import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getProfile } from '../api/auth'

/** Solo deja pasar a usuarios con rol ADMIN; al resto los regresa a su unidad. */
export default function AdminRoute({ children }) {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let active = true
    getProfile()
      .then((profile) => { if (active) setStatus(profile?.role === 'ADMIN' ? 'allowed' : 'denied') })
      .catch(() => { if (active) setStatus('denied') })
    return () => { active = false }
  }, [])

  if (status === 'checking') return null
  if (status === 'denied') return <Navigate to="/app/client" replace />
  return children
}
