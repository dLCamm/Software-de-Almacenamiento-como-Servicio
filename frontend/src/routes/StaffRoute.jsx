import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getProfile } from '../api/auth'

/** Protege las vistas de gestión accesibles para administradores y soporte. */
export default function StaffRoute({ children }) {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let active = true
    getProfile()
      .then((profile) => {
        if (active) setStatus(['ADMIN', 'SUPPORT'].includes(profile?.role) ? 'allowed' : 'denied')
      })
      .catch(() => { if (active) setStatus('denied') })
    return () => { active = false }
  }, [])

  if (status === 'checking') return null
  if (status === 'denied') return <Navigate to="/app/client" replace />
  return children
}
