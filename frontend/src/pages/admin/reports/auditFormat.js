import { formatBytes } from '../../client/dashboard/formatters'

/** Acciones que registra el backend, agrupadas para el filtro. */
export const AUDIT_ACTION_GROUPS = [
  { label: 'Cuenta', actions: [['auth.register', 'Registro'], ['auth.login', 'Inicio de sesión']] },
  {
    label: 'Archivos',
    actions: [
      ['file.upload', 'Subió un archivo'],
      ['file.download', 'Descargó un archivo'],
      ['file.share', 'Compartió un archivo'],
      ['file.move_to_trash', 'Archivo a papelera'],
      ['file.restore', 'Restauró un archivo'],
      ['file.delete_permanently', 'Eliminó un archivo'],
    ],
  },
  {
    label: 'Carpetas',
    actions: [
      ['folder.move_to_trash', 'Carpeta a papelera'],
      ['folder.restore', 'Restauró una carpeta'],
      ['folder.delete_permanently', 'Eliminó una carpeta'],
    ],
  },
  { label: 'Pagos y planes', actions: [['payment.recorded', 'Pago procesado'], ['plan.changed', 'Cambio de plan']] },
  { label: 'Sistema', actions: [['system.retention_purge', 'Limpieza automática de papelera']] },
]

const ACTION_LABELS = Object.fromEntries(AUDIT_ACTION_GROUPS.flatMap((group) => group.actions))

export const RESOURCE_TYPES = [['file', 'Archivo'], ['folder', 'Carpeta'], ['payment', 'Pago'], ['user', 'Usuario']]
const RESOURCE_LABELS = Object.fromEntries(RESOURCE_TYPES)

/** Nombre legible de la acción; si el backend agrega una nueva, se muestra el código tal cual. */
export function getActionLabel(action) {
  return ACTION_LABELS[action] || action || '—'
}

/** Categoría visual de la acción (define el color del indicador). */
export function getActionTone(action = '') {
  if (action.endsWith('delete_permanently')) return 'danger'
  if (action.endsWith('move_to_trash') || action.startsWith('system.')) return 'warning'
  if (action.startsWith('payment.') || action.startsWith('plan.')) return 'money'
  if (action.startsWith('auth.')) return 'account'
  return 'neutral'
}

export function getResourceLabel(type) {
  return RESOURCE_LABELS[type] || type || '—'
}

/** Identificadores largos (UUID) se acortan; el completo queda en el tooltip. */
export function shortId(id) {
  if (!id) return ''
  const text = String(id)
  return text.length > 12 ? `${text.slice(0, 8)}…` : `#${text}`
}

export function formatDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

function formatSeconds(seconds) {
  const value = Number(seconds)
  if (!Number.isFinite(value)) return String(seconds)
  if (value < 3600) return `${Math.round(value / 60)} min`
  if (value < 86400) return `${Math.round(value / 3600)} h`
  const days = Math.round(value / 86400)
  return days === 1 ? '1 día' : `${days} días`
}

const STATUS_LABELS = { APPROVED: 'Aprobado', REJECTED: 'Rechazado', PENDING: 'Pendiente', FAILED: 'Fallido' }
const PAYMENT_TYPE_LABELS = { SUBSCRIPTION: 'Suscripción', RENEWAL: 'Renovación' }

/**
 * Convierte `details` en pares [etiqueta, valor] legibles.
 * `planNames` (id -> nombre) traduce from_plan_id / to_plan_id cuando está disponible.
 */
export function formatDetails(details, planNames = {}) {
  if (!details || typeof details !== 'object') return []
  const planLabel = (id) => planNames[id] || `Plan #${id}`
  const known = {
    extension: (value) => ['Tipo', String(value).toUpperCase()],
    tamano_bytes: (value) => ['Tamaño', formatBytes(Number(value))],
    expiracion_segundos: (value) => ['Enlace válido', formatSeconds(value)],
    status: (value) => ['Estado', STATUS_LABELS[value] || value],
    payment_type: (value) => ['Tipo de pago', PAYMENT_TYPE_LABELS[value] || value],
    from_plan_id: (value) => ['Plan anterior', value === null ? '—' : planLabel(value)],
    to_plan_id: (value) => ['Plan nuevo', planLabel(value)],
    amount: (value) => ['Monto', Number(value).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
  }
  return Object.entries(details).map(([key, value]) => {
    if (known[key]) return known[key](value)
    const label = key.replace(/_/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase())
    if (/_bytes$/.test(key)) return [label.replace(/ bytes$/i, ''), formatBytes(Number(value))]
    return [label, typeof value === 'object' ? JSON.stringify(value) : String(value)]
  })
}
