// Cliente de autenticación, alineado al contrato real del backend
// (Django + SimpleJWT, ver backend/users/views.py y serializers.py).
//
// - POST /api/auth/register/  → { first_name, last_name, email, password, password_confirm }
// - POST /api/auth/login/     → { email, password } → { access, refresh, user }
// - POST /api/auth/token/refresh/ → { refresh } → { access }
// - GET  /api/auth/me/        → requiere header Authorization: Bearer <access>
//
// Los flujos de verificación y recuperación son públicos y no envían JWT.

// Si VITE_API_URL viene vacío (despliegue con Nginx), la API se llama en el mismo origen (/api/...).
const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '')

const ACCESS_TOKEN_KEY = 'vaultdrive_access_token'
const REFRESH_TOKEN_KEY = 'vaultdrive_refresh_token'

export function saveTokens({ access, refresh }) {
  if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access)
  if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
  clearProfileCache()
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  clearProfileCache()
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

const STATUS_MESSAGES = {
  401: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'No encontramos lo que buscas. Puede que se haya movido o eliminado.',
  413: 'El archivo es demasiado grande.',
  500: 'Algo salió mal de nuestro lado. Inténtalo de nuevo en unos minutos.',
}

// Mensajes en inglés que envía Django/SimpleJWT y su versión para el usuario.
const ENGLISH_MESSAGES = [
  [/no active account found/i, 'Correo o contraseña incorrectos.'],
  [/token is invalid or expired|token not valid|given token not valid/i, STATUS_MESSAGES[401]],
  [/authentication credentials were not provided/i, STATUS_MESSAGES[401]],
  [/you do not have permission/i, STATUS_MESSAGES[403]],
  [/^not found\.?$/i, STATUS_MESSAGES[404]],
  [/this field may not be blank|this field is required/i, 'Completa todos los campos obligatorios.'],
  [/enter a valid email/i, 'Ingresa un correo electrónico válido.'],
  [/request was throttled/i, 'Has realizado demasiados intentos. Espera un momento antes de volver a intentarlo.'],
]

function friendlyMessage(message) {
  const text = String(message || '')
  return ENGLISH_MESSAGES.find(([pattern]) => pattern.test(text))?.[1] || text
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
    throw new Error('No pudimos conectarnos. Revisa tu conexión a internet e inténtalo de nuevo.')
  }

  const data = res.ok && responseType === 'blob'
    ? await res.blob()
    : await res.json().catch(() => null)

  if (!res.ok) {
    // DRF devuelve errores por campo ({ email: [...] }) o { detail: "..." }.
    const fieldErrors = data && typeof data === 'object'
      ? Object.entries(data).find(([key]) => !['detail', 'error', 'detalle'].includes(key))
      : null
    const message = friendlyMessage(
      (res.status === 429 ? 'Has realizado demasiados intentos. Espera un momento antes de volver a intentarlo.' : null) ||
      data?.detail ||
      (data?.error && data?.detalle ? `${data.error}: ${data.detalle}` : null) ||
      data?.detalle || data?.error ||
      (fieldErrors ? [].concat(fieldErrors[1]).join(' ') : null) ||
      STATUS_MESSAGES[res.status] ||
      (res.status >= 500 ? STATUS_MESSAGES[500] : 'No se pudo completar la solicitud. Inténtalo de nuevo.'),
    )
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

export function register({ firstName, lastName, email, password, confirmPassword, planCode = 'free' }) {
  return apiRequest('/api/auth/register/', {
    method: 'POST',
    body: {
      first_name: firstName,
      last_name: lastName,
      email,
      password,
      password_confirm: confirmPassword,
      plan_code: planCode,
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

// El menú, la ruta protegida y la página piden el perfil al mismo tiempo: se comparte una sola
// petición y su respuesta se reutiliza unos segundos para no esperar varias veces al servidor.
const PROFILE_CACHE_MS = 5000
let profileRequest = null
let profileRequestedAt = 0

export function clearProfileCache() {
  profileRequest = null
  profileRequestedAt = 0
}

export function getProfile() {
  if (profileRequest && Date.now() - profileRequestedAt < PROFILE_CACHE_MS) return profileRequest
  profileRequestedAt = Date.now()
  profileRequest = apiRequest('/api/auth/me/', { method: 'GET', auth: true })
  profileRequest.catch(() => clearProfileCache())
  return profileRequest
}

export function updateProfile(changes) {
  clearProfileCache()
  return apiRequest('/api/auth/me/', { method: 'PATCH', body: changes, auth: true })
}

export function changePassword({ currentPassword, password, confirmPassword }) {
  return apiRequest('/api/auth/password-change/', {
    method: 'POST',
    body: { current_password: currentPassword, password, password_confirm: confirmPassword },
    auth: true,
  })
}

export function requestPasswordReset({ email }) {
  return apiRequest('/api/auth/password-reset/', {
    method: 'POST',
    body: { email },
  })
}

export function confirmPasswordReset({ uid, token, password, confirmPassword }) {
  return apiRequest('/api/auth/password-reset/confirm/', {
    method: 'POST',
    body: { uid, token, password, password_confirm: confirmPassword },
  })
}

export function verifyEmail({ uid, token }) {
  return apiRequest('/api/auth/verify-email/', {
    method: 'POST',
    body: { uid, token },
  })
}

export function resendVerification({ email }) {
  return apiRequest('/api/auth/resend-verification/', {
    method: 'POST',
    body: { email },
  })
}

export function logout() {
  clearTokens()
}
