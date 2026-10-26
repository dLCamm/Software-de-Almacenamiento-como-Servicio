import { apiRequest } from './auth'

/** Lista cuentas gestionables con los filtros que admite la API. */
export function listManagedUsers(filters = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value !== undefined && value !== null) query.set(key, value)
  }
  const suffix = query.size ? `?${query.toString()}` : ''
  return apiRequest(`/api/auth/management/users/${suffix}`, { auth: true })
}

/** Consulta el perfil administrativo y la suscripción de una cuenta. */
export function getManagedUser(userId) {
  return apiRequest(`/api/auth/management/${userId}/`, { auth: true })
}

/** Actualiza únicamente los campos enviados del usuario administrado. */
export function updateManagedUser(userId, changes) {
  return apiRequest(`/api/auth/management/${userId}/edit/`, {
    method: 'PATCH',
    body: changes,
    auth: true,
  })
}

/** Activa o desactiva una cuenta administrada. */
export function updateManagedUserStatus(userId, isActive) {
  return apiRequest(`/api/auth/management/${userId}/status/`, {
    method: 'PATCH',
    body: { is_active: isActive },
    auth: true,
  })
}

/** Historial global de pagos para administración y soporte. */
export function listManagedPayments(filters = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value !== undefined && value !== null) query.set(key, value)
  }
  const suffix = query.size ? `?${query.toString()}` : ''
  return apiRequest(`/api/payments/management/${suffix}`, { auth: true })
}
