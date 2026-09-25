const configuredApiUrl = import.meta.env.VITE_API_URL
const apiUrl = (configuredApiUrl || 'http://localhost:8000').replace(/\/$/, '')

function firstErrorMessage(data) {
  if (!data || typeof data !== 'object') return 'No fue posible procesar la solicitud.'
  const message = data.detail ?? data.message
  if (typeof message === 'string') return message
  const [field, errors] = Object.entries(data)[0] ?? []
  if (Array.isArray(errors) && errors[0]) return errors[0]
  if (typeof errors === 'string') return errors
  return field ? 'Revisa los datos enviados e inténtalo de nuevo.' : 'No fue posible procesar la solicitud.'
}

function formFields(data) {
  if (!data || typeof data !== 'object') return {}
  const fieldNames = {
    first_name: 'firstName',
    last_name: 'lastName',
    password_confirm: 'passwordConfirm',
  }
  return Object.fromEntries(
    Object.entries(data).map(([field, errors]) => [
      fieldNames[field] ?? field,
      Array.isArray(errors) ? errors.join(' ') : errors,
    ]),
  )
}

export async function register(payload) {
  let response
  try {
    response = await fetch(`${apiUrl}/api/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    const error = new Error('No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.')
    error.fields = {}
    throw error
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(firstErrorMessage(data))
    error.fields = formFields(data)
    throw error
  }
  return data
}
