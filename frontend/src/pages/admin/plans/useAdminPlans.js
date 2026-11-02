import { useCallback, useEffect, useState } from 'react'

const GB = 1024 ** 3

export const PLAN_FEATURES = [
  { code: 'temporary_files', label: 'Archivos temporales', description: 'Permite subir archivos que se eliminan al vencer el plazo elegido.' },
  { code: 'share_links', label: 'Compartir enlaces', description: 'Permite generar enlaces de descarga para compartir archivos.' },
]

function errorMessage(error) {
  return error?.message || 'No se pudo completar la operación.'
}

/** Almacenamiento del plan en GB, venga como storage_limit_gb o storage_limit_bytes. */
export function getPlanStorageGb(plan) {
  if (plan?.storage_limit_gb !== undefined && plan?.storage_limit_gb !== null) return Number(plan.storage_limit_gb)
  const bytes = Number(plan?.storage_limit_bytes)
  return Number.isFinite(bytes) ? Math.round((bytes / GB) * 100) / 100 : 0
}

/** Convierte el formulario en el cuerpo que espera la API (POST / PUT). */
export function toPlanPayload(form) {
  return {
    code: form.code.trim().toLowerCase(),
    name: form.name.trim(),
    storage_limit_gb: Number(form.storageGb),
    monthly_price: Number(form.price).toFixed(2),
    is_active: form.isActive,
    benefits: [...form.benefits
      .map((benefit) => benefit.description.trim())
      .filter(Boolean)
      .map((description) => ({ description, feature: '' })),
      ...PLAN_FEATURES.filter(({ code }) => form.features[code])
        .map(({ code, label }) => ({ description: label, feature: code })),
    ].map((benefit, index) => ({ ...benefit, order: index + 1 })),
  }
}

/** Formulario a partir de un plan existente (o vacío para uno nuevo). */
export function toPlanForm(plan) {
  if (!plan) return { code: '', name: '', price: '', storageGb: '', isActive: true, features: { temporary_files: false, share_links: false }, benefits: [{ key: 1, description: '' }] }
  const benefits = (plan.benefits || []).filter((benefit) => !benefit.feature).sort((a, b) => a.order - b.order)
  return {
    code: plan.code || '',
    name: plan.name || '',
    price: String(Number(plan.monthly_price ?? 0)),
    storageGb: String(getPlanStorageGb(plan)),
    isActive: plan.is_active !== false,
    features: Object.fromEntries(PLAN_FEATURES.map(({ code }) => [code, Boolean(plan.features?.[code])])),
    benefits: benefits.length ? benefits.map((benefit, index) => ({ key: benefit.id ?? index + 1, description: benefit.description })) : [{ key: 1, description: '' }],
  }
}

export function validatePlanForm(form) {
  if (!form.name.trim()) return 'Escribe el nombre del plan.'
  if (!/^[a-z0-9-]+$/.test(form.code.trim().toLowerCase())) return 'El código solo puede tener letras minúsculas, números y guiones (ej. premium).'
  const price = Number(form.price)
  if (form.price === '' || !Number.isFinite(price) || price < 0) return 'El precio debe ser 0 o mayor.'
  if (form.code.trim().toLowerCase() === 'free' && (price !== 0 || !form.isActive)) return 'El plan FREE debe ser gratuito y permanecer activo.'
  const hasFeatures = Object.values(form.features).some(Boolean)
  if (hasFeatures && (price <= 0 || form.code.trim().toLowerCase() === 'free')) return 'Los archivos temporales y los enlaces compartidos requieren un plan con precio mayor a 0.'
  const storage = Number(form.storageGb)
  if (form.storageGb === '' || !Number.isFinite(storage) || storage <= 0) return 'El almacenamiento debe ser mayor a 0 GB.'
  if (!hasFeatures && !form.benefits.some((benefit) => benefit.description.trim())) return 'Agrega al menos un beneficio.'
  return ''
}

/** Estado y acciones de la página de gestión de planes. `adminApi` lo inyecta la página. */
export default function useAdminPlans(adminApi) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const applyList = useCallback((data) => {
    const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
    setPlans(list.slice().sort((a, b) => Number(a.monthly_price) - Number(b.monthly_price)))
  }, [])

  useEffect(() => {
    let active = true
    adminApi.listAdminPlans()
      .then((data) => { if (active) { applyList(data); setError('') } })
      .catch((loadError) => { if (active) setError(errorMessage(loadError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [adminApi, applyList])

  // Recarga la lista después de guardar, activar o eliminar.
  async function load() {
    try {
      applyList(await adminApi.listAdminPlans())
    } catch (loadError) {
      setError(errorMessage(loadError))
    }
  }

  /** Crea o actualiza. Devuelve '' si salió bien o el mensaje de error para mostrarlo en el formulario. */
  async function savePlan(planId, form) {
    const validation = validatePlanForm(form)
    if (validation) return validation
    try {
      const payload = toPlanPayload(form)
      if (planId) await adminApi.updateAdminPlan(planId, payload)
      else await adminApi.createAdminPlan(payload)
      setNotice(planId ? `Plan ${payload.name} actualizado.` : `Plan ${payload.name} creado.`)
      await load()
      return ''
    } catch (saveError) {
      return errorMessage(saveError)
    }
  }

  async function toggleActive(plan) {
    setBusyId(plan.id)
    setError('')
    try {
      await adminApi.patchAdminPlan(plan.id, { is_active: !plan.is_active })
      setNotice(`Plan ${plan.name} ${plan.is_active ? 'desactivado: ya no aparece para los clientes' : 'activado: ya aparece para los clientes'}.`)
      await load()
    } catch (toggleError) {
      setError(errorMessage(toggleError))
    } finally {
      setBusyId(null)
    }
  }

  async function removePlan(plan) {
    setBusyId(plan.id)
    setError('')
    try {
      await adminApi.deleteAdminPlan(plan.id)
      setNotice(`Plan ${plan.name} eliminado.`)
      await load()
      return true
    } catch (deleteError) {
      setError(`${errorMessage(deleteError)} Si hay clientes con este plan, puedes desactivarlo en lugar de eliminarlo.`)
      return false
    } finally {
      setBusyId(null)
    }
  }

  return {
    plans, loading, busyId, error, notice,
    clearMessages: () => { setError(''); setNotice('') },
    savePlan, toggleActive, removePlan,
  }
}
