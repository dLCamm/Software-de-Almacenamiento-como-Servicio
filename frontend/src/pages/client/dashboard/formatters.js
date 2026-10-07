export function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1 }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unit]}`
}

export function getTrashDaysRemaining(expirationDate, now = Date.now()) {
  const expiration = Date.parse(expirationDate)
  if (!Number.isFinite(expiration)) return null
  return Math.max(0, Math.ceil((expiration - now) / (24 * 60 * 60 * 1000)))
}

export function formatDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
