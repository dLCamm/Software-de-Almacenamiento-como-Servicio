// Etiquetas en español para valores que el servidor envía como códigos.
export const ROLE_LABELS = { CLIENT: 'Cliente', SUPPORT: 'Soporte', ADMIN: 'Administrador' }
export const SUBSCRIPTION_LABELS = { ACTIVE: 'Activa', EXPIRED: 'Vencida', CANCELLED: 'Cancelada', CANCELED: 'Cancelada', PENDING: 'Pendiente' }
export const PAYMENT_LABELS = { APPROVED: 'Aprobado', REJECTED: 'Rechazado', PENDING: 'Pendiente', FAILED: 'Fallido' }

export const label = (map, value) => map[String(value || '').toUpperCase()] || value || '—'
