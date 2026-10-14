import { useEffect, useRef, useState } from 'react'
import { toPlanForm } from './useAdminPlans'
import { AdminIcon } from './AdminIcon'

function slugify(value) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

let nextKey = 1000

/** Ventana para crear o editar un plan. `plan` vacío = plan nuevo. */
export default function PlanFormDialog({ plan, onClose, onSave }) {
  const [form, setForm] = useState(() => toPlanForm(plan))
  const [codeTouched, setCodeTouched] = useState(Boolean(plan))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const nameInput = useRef(null)
  const isNew = !plan

  useEffect(() => {
    nameInput.current?.focus()
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function update(field, value) {
    setError('')
    setForm((current) => {
      const next = { ...current, [field]: value }
      // Al crear, el código se sugiere a partir del nombre hasta que lo edites a mano.
      if (field === 'name' && !codeTouched) next.code = slugify(value)
      return next
    })
  }

  function updateBenefit(key, description) {
    setError('')
    setForm((current) => ({ ...current, benefits: current.benefits.map((benefit) => benefit.key === key ? { ...benefit, description } : benefit) }))
  }

  function addBenefit() {
    setForm((current) => ({ ...current, benefits: [...current.benefits, { key: nextKey++, description: '' }] }))
  }

  function removeBenefit(key) {
    setForm((current) => ({ ...current, benefits: current.benefits.length > 1 ? current.benefits.filter((benefit) => benefit.key !== key) : [{ key: nextKey++, description: '' }] }))
  }

  function moveBenefit(index, direction) {
    setForm((current) => {
      const benefits = current.benefits.slice()
      const target = index + direction
      if (target < 0 || target >= benefits.length) return current
      ;[benefits[index], benefits[target]] = [benefits[target], benefits[index]]
      return { ...current, benefits }
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const message = await onSave(form)
    setSaving(false)
    if (message) setError(message)
    else onClose()
  }

  return <div className="admin-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <form className="admin-dialog" onSubmit={handleSubmit} aria-labelledby="plan-form-title" noValidate>
      <header className="admin-dialog__header">
        <h2 id="plan-form-title">{isNew ? 'Nuevo plan' : `Editar plan ${plan.name}`}</h2>
        <button type="button" className="admin-icon-button" onClick={onClose} aria-label="Cerrar"><AdminIcon name="x" /></button>
      </header>

      <div className="admin-dialog__body">
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Nombre</span>
            <input ref={nameInput} value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Ej. PREMIUM" maxLength={60} required />
          </label>
          <label className="admin-field">
            <span>Código</span>
            <input value={form.code} onChange={(event) => { setCodeTouched(true); update('code', event.target.value.toLowerCase()) }} placeholder="ej. premium" maxLength={40} required />
            <small>Identificador interno: minúsculas, números y guiones.</small>
          </label>
          <label className="admin-field">
            <span>Precio mensual</span>
            <div className="admin-input-affix"><b>Q</b><input type="number" inputMode="decimal" min="0" step="0.01" value={form.price} onChange={(event) => update('price', event.target.value)} placeholder="249.00" required /></div>
          </label>
          <label className="admin-field">
            <span>Almacenamiento</span>
            <div className="admin-input-affix admin-input-affix--end"><input type="number" inputMode="decimal" min="1" step="1" value={form.storageGb} onChange={(event) => update('storageGb', event.target.value)} placeholder="100" required /><b>GB</b></div>
          </label>
        </div>

        <label className="admin-switch">
          <input type="checkbox" checked={form.isActive} onChange={(event) => update('isActive', event.target.checked)} />
          <span className="admin-switch__track" aria-hidden="true" />
          <span><strong>Plan activo</strong><small>Los planes inactivos no se muestran a los clientes.</small></span>
        </label>

        <fieldset className="admin-benefits">
          <legend>Beneficios <small>En este orden se muestran en la tarjeta del plan.</small></legend>
          {form.benefits.map((benefit, index) => <div className="admin-benefit" key={benefit.key}>
            <span className="admin-benefit__number">{index + 1}</span>
            <input value={benefit.description} onChange={(event) => updateBenefit(benefit.key, event.target.value)} placeholder="Ej. Soporte prioritario" aria-label={`Beneficio ${index + 1}`} maxLength={120} />
            <button type="button" className="admin-icon-button" onClick={() => moveBenefit(index, -1)} disabled={index === 0} aria-label="Subir beneficio"><AdminIcon name="up" size={16} /></button>
            <button type="button" className="admin-icon-button" onClick={() => moveBenefit(index, 1)} disabled={index === form.benefits.length - 1} aria-label="Bajar beneficio"><AdminIcon name="down" size={16} /></button>
            <button type="button" className="admin-icon-button admin-icon-button--danger" onClick={() => removeBenefit(benefit.key)} aria-label="Quitar beneficio"><AdminIcon name="trash" size={16} /></button>
          </div>)}
          <button type="button" className="admin-add-benefit" onClick={addBenefit}><AdminIcon name="plus" size={16} />Agregar beneficio</button>
        </fieldset>

        {error && <div className="admin-alert admin-alert--error" role="alert">{error}</div>}
      </div>

      <footer className="admin-dialog__footer">
        <button type="button" className="admin-button admin-button--secondary" onClick={onClose} disabled={saving}>Cancelar</button>
        <button type="submit" className="admin-button admin-button--primary" disabled={saving}>{saving ? 'Guardando…' : isNew ? 'Crear plan' : 'Guardar cambios'}</button>
      </footer>
    </form>
  </div>
}
