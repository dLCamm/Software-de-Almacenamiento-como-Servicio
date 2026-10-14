import { apiRequest } from './auth'

// CRUD de planes para el administrador (/api/admin/plans/).

export function listAdminPlans() {
  return apiRequest('/api/admin/plans/', { auth: true })
}

export function createAdminPlan(plan) {
  return apiRequest('/api/admin/plans/', { method: 'POST', body: plan, auth: true })
}

export function updateAdminPlan(planId, plan) {
  return apiRequest(`/api/admin/plans/${planId}/`, { method: 'PUT', body: plan, auth: true })
}

export function patchAdminPlan(planId, changes) {
  return apiRequest(`/api/admin/plans/${planId}/`, { method: 'PATCH', body: changes, auth: true })
}

export function deleteAdminPlan(planId) {
  return apiRequest(`/api/admin/plans/${planId}/`, { method: 'DELETE', auth: true })
}
