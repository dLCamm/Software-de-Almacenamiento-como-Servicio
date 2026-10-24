import { apiRequest } from './auth'

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
