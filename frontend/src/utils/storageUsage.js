const USAGE_EVENT = 'kubo:storage-usage'

/** Porcentaje usado (0-100) calculado con los bytes, para no perder decimales cuando el uso es pequeño. */
export function getUsagePercent(usage) {
  const used = Number(usage?.usado_bytes)
  const max = Number(usage?.maximo_bytes)
  const percent = max > 0 && Number.isFinite(used) ? (used / max) * 100 : Number(usage?.porcentaje_usado) || 0
  return Math.min(100, Math.max(0, percent))
}

/** Texto del porcentaje: "0%", "0.05%", "3.4%", "57%". */
export function formatUsagePercent(percent) {
  if (!percent) return '0%'
  if (percent < 0.01) return '<0.01%'
  if (percent < 1) return `${Number(percent.toFixed(2))}%`
  if (percent < 10) return `${Number(percent.toFixed(1))}%`
  return `${Math.round(percent)}%`
}

/** Porcentaje para dibujar barras/círculos: si hay algo usado, siempre se ve un poco de relleno. */
export function getVisualPercent(percent) {
  return percent > 0 ? Math.max(percent, 2) : 0
}

/** Avisa a toda la app (por ejemplo a la barra lateral) que el uso de almacenamiento cambió. */
export function publishStorageUsage(usage) {
  if (usage && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(USAGE_EVENT, { detail: usage }))
  }
}

/** Escucha los cambios de uso de almacenamiento. Devuelve la función para dejar de escuchar. */
export function subscribeStorageUsage(callback) {
  const onUsage = (event) => callback(event.detail)
  window.addEventListener(USAGE_EVENT, onUsage)
  return () => window.removeEventListener(USAGE_EVENT, onUsage)
}
