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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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

async function request(path, options = {}) {
  const { auth, ...fetchOptions } = options
  const headers = { 'Content-Type': 'application/json', ...fetchOptions.headers }

  if (auth) {
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    // DRF devuelve errores por campo ({ email: [...] }) o { detail: "..." }.
    const fieldErrors = Object.entries(data).find(([key]) => key !== 'detail')
    const message =
      data.detail ||
      (fieldErrors ? `${fieldErrors[0]}: ${[].concat(fieldErrors[1]).join(' ')}` : null) ||
      'Ocurrió un error inesperado.'
    const error = new Error(message)
    error.data = data
    throw error
  }

  return data
}

export async function login({ email, password }) {
  const data = await request('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  saveTokens(data)
  return data
}

export function register({ firstName, lastName, email, password, confirmPassword }) {
  return request('/api/auth/register/', {
    method: 'POST',
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      email,
      password,
      password_confirm: confirmPassword,
    }),
  })
}

export async function refreshAccessToken() {
  const refresh = getRefreshToken()
  if (!refresh) throw new Error('No hay sesión activa.')

  const data = await request('/api/auth/token/refresh/', {
    method: 'POST',
    body: JSON.stringify({ refresh }),
  })
  saveTokens({ access: data.access })
  return data
}

export function getProfile() {
  return request('/api/auth/me/', { method: 'GET', auth: true })
}

// Aún no implementado en el backend — ver nota arriba.
export function requestPasswordReset({ email }) {
  return request('/api/auth/password-reset/', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function logout() {
  clearTokens()
}
