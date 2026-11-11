import { apiRequest } from './auth'

export function listPlans() {
  return apiRequest('/api/plans/', { auth: true })
}

/** Plan y suscripción del usuario: fecha de vencimiento, días restantes, renovación automática. */
export function getCurrentPlan() {
  return apiRequest('/api/plans/current/', { auth: true })
}

export function getPaymentHistory() {
  return apiRequest('/api/payments/history/', { auth: true })
}

export function changePlan(planId, card) {
  return apiRequest('/api/payments/change-plan/', {
    method: 'POST',
    body: { plan_id: planId, card },
    auth: true,
  })
}

export function renewPlan(card) {
  return apiRequest('/api/payments/renew/', {
    method: 'POST',
    body: { card },
    auth: true,
  })
}
