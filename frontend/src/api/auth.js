// Cliente de autenticación, alineado al contrato real del backend
// (Django + SimpleJWT, ver backend/users/views.py y serializers.py).
//
// - POST /api/auth/register/  → { first_name, last_name, email, password, password_confirm }
// - POST /api/auth/login/     → { email, password } → { access, refresh, user }
// - POST /api/auth/token/refresh/ → { refresh } → { access }
// - GET  /api/auth/me/        → requiere header Authorization: Bearer <access>
//
// Nota: el backend todavía NO tiene endpoint de recuperación de contraseña
// (no existe /api/auth/password-reset/ en users/urls.py). La función
// requestPasswordReset() queda lista para conectarse en cuanto se agregue.

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')

const ACCESS_TOKEN_KEY = 'vaultdrive_access_token'
const REFRESH_TOKEN_KEY = 'vaultdrive_refresh_token'

export function saveTokens({ access, refresh }) {
  if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access)
  if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export async function apiRequest(path, options = {}) {
  const { auth, responseType, ...fetchOptions } = options
  const isFormData = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData
  const headers = { ...(isFormData ? {} : { 'Content-Type': 'application/json' }), ...fetchOptions.headers }

  if (auth) {
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const body = fetchOptions.body && typeof fetchOptions.body !== 'string' && !isFormData
    ? JSON.stringify(fetchOptions.body)
    : fetchOptions.body
  let res
  try {
    res = await fetch(`${API_URL}${path}`, { ...fetchOptions, body, headers })
  } catch {
    throw new Error('No se pudo conectar con la API. Verifica que el servidor esté disponible e inténtalo de nuevo.')
  }

  const data = res.ok && responseType === 'blob'
    ? await res.blob()
    : await res.json().catch(() => null)

  if (!res.ok) {
    // DRF devuelve errores por campo ({ email: [...] }) o { detail: "..." }.
    const fieldErrors = data && typeof data === 'object'
      ? Object.entries(data).find(([key]) => !['detail', 'error', 'detalle'].includes(key))
      : null
    const message =
      data?.detail ||
      (data?.error && data?.detalle ? `${data.error}: ${data.detalle}` : null) ||
      data?.detalle || data?.error ||
      (fieldErrors ? `${fieldErrors[0]}: ${[].concat(fieldErrors[1]).join(' ')}` : null) ||
      (res.status === 401
        ? 'Tu sesión no está autorizada o expiró. Vuelve a iniciar sesión.'
        : `La API respondió con el estado HTTP ${res.status}. No se pudo completar la solicitud.`)
    const error = new Error(message)
    error.data = data
    error.status = res.status
    throw error
  }

  return data
}

export async function login({ email, password }) {
  const data = await apiRequest('/api/auth/login/', {
    method: 'POST',
    body: { email, password },
  })
  saveTokens(data)
  return data
}

export function register({ firstName, lastName, email, password, confirmPassword }) {
  return apiRequest('/api/auth/register/', {
    method: 'POST',
    body: {
      first_name: firstName,
      last_name: lastName,
      email,
      password,
      password_confirm: confirmPassword,
    },
  })
}

export async function refreshAccessToken() {
  const refresh = getRefreshToken()
  if (!refresh) throw new Error('No hay sesión activa.')

  const data = await apiRequest('/api/auth/token/refresh/', {
    method: 'POST',
    body: { refresh },
  })
  saveTokens({ access: data.access })
  return data
}

export function getProfile() {
  return apiRequest('/api/auth/me/', { method: 'GET', auth: true })
}

// Aún no implementado en el backend — ver nota arriba.
export function requestPasswordReset({ email }) {
  return apiRequest('/api/auth/password-reset/', {
    method: 'POST',
    body: { email },
  })
}

export function logout() {
  clearTokens()
}
