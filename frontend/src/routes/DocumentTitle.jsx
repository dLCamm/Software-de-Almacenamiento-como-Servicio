import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Título de la pestaña del navegador según la página. El primer prefijo que coincide gana.
const TITLES = [
  ['/app/client/billing/planes', 'Planes'],
  ['/app/client/billing/pago', 'Método de pago'],
  ['/app/client/billing/historial', 'Historial de pagos'],
  ['/app/client/billing', 'Planes y facturación'],
  ['/app/client', 'Mis archivos'],
  ['/app/configuracion', 'Configuración'],
  ['/app/admin/inicio', 'Administración'],
  ['/app/admin/usuarios/', 'Detalle de usuario'],
  ['/app/admin/usuarios', 'Usuarios'],
  ['/app/admin/pagos', 'Pagos'],
  ['/app/admin/planes', 'Gestión de planes'],
  ['/app/admin/estadisticas', 'Estadísticas'],
  ['/app/admin/auditoria', 'Auditoría'],
  ['/login', 'Iniciar sesión'],
  ['/register', 'Crear cuenta'],
  ['/recover-password', 'Recuperar contraseña'],
  ['/reset-password', 'Nueva contraseña'],
  ['/verify-email', 'Verificar correo'],
  ['/resend-verification', 'Verificar correo'],
  ['/share', 'Archivo compartido'],
]

/** Actualiza document.title en cada cambio de ruta: "Mis archivos · Kubo". */
export default function DocumentTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    const title = TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1]
    document.title = title ? `${title} · Kubo` : 'Kubo · Tu almacenamiento en la nube'
  }, [pathname])
  return null
}
