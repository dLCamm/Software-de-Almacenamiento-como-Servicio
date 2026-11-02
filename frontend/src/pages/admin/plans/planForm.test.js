import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toPlanForm, toPlanPayload, validatePlanForm } from './useAdminPlans.js'

function paidForm() {
  return { ...toPlanForm(), code: 'custom', name: 'Custom', price: '20', storageGb: '10' }
}

test('new plans start without paid features', () => {
  const form = toPlanForm()
  assert.deepEqual(form.features, { temporary_files: false, share_links: false })
})

test('a selected functional benefit is enough to create a plan and survives editing', () => {
  const form = paidForm()
  form.features.share_links = true
  assert.equal(validatePlanForm(form), '')
  const payload = toPlanPayload(form)
  assert.deepEqual(payload.benefits, [{ feature: 'share_links', description: 'Compartir enlaces', order: 1 }])
  const restored = toPlanForm({ ...payload, features: form.features })
  assert.deepEqual(restored.features, form.features)
  assert.deepEqual(toPlanPayload(restored).benefits, payload.benefits)
})

test('removing a feature removes its advertised benefit as well', () => {
  const form = toPlanForm({
    code: 'custom', name: 'Custom', monthly_price: '20', storage_limit_bytes: 10 * 1024 ** 3,
    features: { share_links: true, temporary_files: false },
    benefits: [
      { id: 1, feature: 'share_links', description: 'Compartir enlaces', order: 1 },
      { id: 2, feature: '', description: 'Gestión de carpetas', order: 2 },
    ],
  })
  form.features.share_links = false
  const payload = toPlanPayload(form)
  assert.deepEqual(payload.benefits, [{ description: 'Gestión de carpetas', feature: '', order: 1 }])
})

test('informative text does not grant access', () => {
  const form = paidForm()
  form.benefits = [{ key: 1, description: 'Archivos temporales' }]
  assert.equal(toPlanPayload(form).benefits[0].feature, '')
})

test('free plans and a change to zero price cannot keep paid functions', () => {
  const form = paidForm()
  form.features.temporary_files = true
  form.price = '0'
  assert.match(validatePlanForm(form), /precio mayor a 0/)
  form.code = 'free'
  assert.match(validatePlanForm(form), /precio mayor a 0/)
})
