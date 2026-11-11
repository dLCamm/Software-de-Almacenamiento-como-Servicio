import PageLoading from '../components/PageLoading'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getProfile } from '../api/auth'

/** Las secciones de almacenamiento y facturación personal son exclusivas de clientes. */
export default function ClientRoute({ children }) {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let active = true
    getProfile()
      .then((profile) => { if (active) setStatus(profile?.role || 'denied') })
      .catch(() => { if (active) setStatus('denied') })
    return () => { active = false }
  }, [])

  if (status === 'checking') return <PageLoading />
  if (status === 'ADMIN') return <Navigate to="/app/admin/inicio" replace />
  if (status === 'SUPPORT') return <Navigate to="/app/admin/usuarios" replace />
  if (status !== 'CLIENT') return <Navigate to="/login" replace />
  return children
}
