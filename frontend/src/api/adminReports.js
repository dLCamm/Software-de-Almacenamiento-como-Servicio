import { apiRequest } from './auth'

// Auditoría y estadísticas globales (solo administradores).

/** Eventos de auditoría paginados. Filtros: action, resource_type, page, page_size. */
export function listAuditEvents(filters = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value !== undefined && value !== null) query.set(key, value)
  }
  const suffix = query.size ? `?${query.toString()}` : ''
  return apiRequest(`/api/admin/audit/${suffix}`, { auth: true })
}

/** Resumen de usuarios, ingresos, pagos y almacenamiento. */
export function getAdminStatistics() {
  return apiRequest('/api/admin/statistics/', { auth: true })
}

/** Uso global de almacenamiento agrupado por extensión. */
export function getStorageByType() {
  return apiRequest('/api/admin/statistics/storage-by-type/', { auth: true })
}
