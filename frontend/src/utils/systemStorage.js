import { useEffect, useState } from 'react'
import { getAdminStatistics } from '../api/adminReports'

/**
 * Uso de almacenamiento de TODO el sistema (todos los usuarios), para la cuenta de administrador.
 * Sale de GET /api/admin/statistics/. Con `enabled` en false no hace ninguna petición.
 * `refreshKey` vuelve a consultar cuando cambia (por ejemplo, al subir o borrar un archivo).
 */
export default function useSystemStorage(enabled, refreshKey) {
  const [systemStorage, setSystemStorage] = useState(null)

  useEffect(() => {
    if (!enabled) return undefined
    let active = true
    getAdminStatistics()
      .then((stats) => {
        if (!active) return
        setSystemStorage({
          usedBytes: Number(stats?.almacenamiento?.usado_bytes || 0),
          files: Number(stats?.almacenamiento?.archivos_activos_y_en_papelera || 0),
          users: Number(stats?.usuarios?.total || 0),
        })
      })
      .catch(() => {})
    return () => { active = false }
  }, [enabled, refreshKey])

  return systemStorage
}
