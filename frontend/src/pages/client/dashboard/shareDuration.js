export const MAX_SHARE_SECONDS = 7 * 24 * 60 * 60

export function formatShareDuration(seconds) {
  const total = Math.round(Number(seconds) || 0)
  const plural = (value, one, many) => `${value} ${value === 1 ? one : many}`
  if (total % 86400 === 0) return plural(total / 86400, 'día', 'días')
  if (total >= 86400) {
    const days = Math.floor(total / 86400)
    const hours = Math.round((total % 86400) / 3600)
    return hours ? `${plural(days, 'día', 'días')} y ${plural(hours, 'hora', 'horas')}` : plural(days, 'día', 'días')
  }
  if (total % 3600 === 0) return plural(total / 3600, 'hora', 'horas')
  if (total >= 3600) return `${plural(Math.floor(total / 3600), 'hora', 'horas')} y ${plural(Math.round((total % 3600) / 60), 'minuto', 'minutos')}`
  return plural(Math.max(1, Math.round(total / 60)), 'minuto', 'minutos')
}
