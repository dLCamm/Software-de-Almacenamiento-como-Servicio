import { apiRequest } from './auth'

/** Actualiza únicamente los campos enviados del usuario administrado. */
export function updateManagedUser(userId, changes) {
  return apiRequest(`/api/auth/management/${userId}/edit/`, {
    method: 'PATCH',
    body: changes,
    auth: true,
  })
}
