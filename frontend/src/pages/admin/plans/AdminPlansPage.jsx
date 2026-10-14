import { useCallback, useState } from 'react'
import * as adminApi from '../../../api/adminPlans'
import { AdminIcon } from './AdminIcon'
import PlanFormDialog from './PlanFormDialog'
import useAdminPlans, { getPlanStorageGb } from './useAdminPlans'
import './AdminPlansPage.css'

function formatMoney(value) {
  const amount = Number(value || 0)
  return amount === 0 ? 'Gratis' : `Q${amount.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatGb(gb) {
  return `${Number(gb).toLocaleString('es-GT', { maximumFractionDigits: 2 })} GB`
}

export default function AdminPlansPage() {
  const admin = useAdminPlans(adminApi)
  // editing: undefined = cerrado, null = plan nuevo, objeto = plan a editar
  const [editing, setEditing] = useState(undefined)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const closeForm = useCallback(() => setEditing(undefined), [])

  const activeCount = admin.plans.filter((plan) => plan.is_active).length

  return <main className="admin-page">
    <header className="admin-header">
      <div>
        <span className="admin-header__crumb">Administrador</span>
        <h1>Gestión de planes</h1>
        <p>{admin.loading && !admin.plans.length ? 'Cargando planes…' : `${admin.plans.length} planes · ${activeCount} visibles para los clientes`}</p>
      </div>
      <button className="admin-button admin-button--primary" type="button" onClick={() => setEditing(null)}><AdminIcon name="plus" />Nuevo plan</button>
    </header>

    <div className="admin-content">
      {admin.error && <div className="admin-alert admin-alert--error" role="alert"><span>{admin.error}</span><button type="button" onClick={admin.clearMessages} aria-label="Cerrar mensaje"><AdminIcon name="x" size={16} /></button></div>}
      {admin.notice && <div className="admin-alert admin-alert--success" role="status"><AdminIcon name="check" size={16} /><span>{admin.notice}</span><button type="button" onClick={admin.clearMessages} aria-label="Cerrar mensaje"><AdminIcon name="x" size={16} /></button></div>}

      {admin.loading && !admin.plans.length
        ? <div className="admin-empty"><span className="admin-spinner" />Cargando planes…</div>
        : !admin.plans.length
          ? <div className="admin-empty"><AdminIcon name="layers" size={34} /><h2>Aún no hay planes</h2><p>Crea el primero para que los clientes puedan contratarlo.</p><button className="admin-button admin-button--primary" type="button" onClick={() => setEditing(null)}><AdminIcon name="plus" />Nuevo plan</button></div>
          : <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Plan</th><th>Precio</th><th>Almacenamiento</th><th>Beneficios</th><th>Visible</th><th><span className="visually-hidden">Acciones</span></th></tr></thead>
              <tbody>
                {admin.plans.map((plan) => {
                  const busy = admin.busyId === plan.id
                  const benefits = (plan.benefits || []).slice().sort((a, b) => a.order - b.order)
                  return <tr key={plan.id} className={plan.is_active ? '' : 'is-inactive'}>
                    <td data-label="Plan"><strong className="admin-plan-name">{plan.name}</strong><code className="admin-plan-code">{plan.code}</code></td>
                    <td data-label="Precio"><span><span className="admin-price">{formatMoney(plan.monthly_price)}</span>{Number(plan.monthly_price) > 0 && <small>/mes</small>}</span></td>
                    <td data-label="Almacenamiento">{formatGb(getPlanStorageGb(plan))}</td>
                    <td data-label="Beneficios"><span className="admin-benefits-cell"><span className="admin-benefit-count" title={benefits.map((benefit) => benefit.description).join('\n')}>{benefits.length} {benefits.length === 1 ? 'beneficio' : 'beneficios'}</span><span className="admin-benefit-preview">{benefits.slice(0, 2).map((benefit) => benefit.description).join(' · ')}{benefits.length > 2 ? '…' : ''}</span></span></td>
                    <td data-label="Visible">
                      <label className="admin-switch admin-switch--compact" title={plan.is_active ? 'Desactivar' : 'Activar'}>
                        <input type="checkbox" checked={Boolean(plan.is_active)} disabled={busy} onChange={() => admin.toggleActive(plan)} aria-label={`${plan.is_active ? 'Desactivar' : 'Activar'} plan ${plan.name}`} />
                        <span className="admin-switch__track" aria-hidden="true" />
                        <span className="admin-status">{plan.is_active ? 'Activo' : 'Inactivo'}</span>
                      </label>
                    </td>
                    <td className="admin-actions">
                      <button type="button" className="admin-icon-button" onClick={() => setEditing(plan)} disabled={busy} aria-label={`Editar plan ${plan.name}`} title="Editar"><AdminIcon name="edit" /></button>
                      <button type="button" className="admin-icon-button admin-icon-button--danger" onClick={() => setConfirmDelete(plan)} disabled={busy} aria-label={`Eliminar plan ${plan.name}`} title="Eliminar"><AdminIcon name="trash" /></button>
                    </td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>}
    </div>

    {editing !== undefined && <PlanFormDialog plan={editing} onClose={closeForm} onSave={(form) => admin.savePlan(editing?.id, form)} />}

    {confirmDelete && <div className="admin-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmDelete(null) }}>
      <div className="admin-dialog admin-dialog--confirm" role="alertdialog" aria-labelledby="delete-title" aria-describedby="delete-text">
        <div className="admin-dialog__body">
          <span className="admin-confirm-icon"><AdminIcon name="trash" size={26} /></span>
          <h2 id="delete-title">¿Eliminar el plan {confirmDelete.name}?</h2>
          <p id="delete-text">Esta acción no se puede deshacer. Si solo quieres que los clientes dejen de verlo, es mejor <strong>desactivarlo</strong>.</p>
        </div>
        <footer className="admin-dialog__footer">
          <button type="button" className="admin-button admin-button--secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
          <button type="button" className="admin-button admin-button--danger" disabled={admin.busyId === confirmDelete.id} onClick={async () => { await admin.removePlan(confirmDelete); setConfirmDelete(null) }}>{admin.busyId === confirmDelete.id ? 'Eliminando…' : 'Eliminar plan'}</button>
        </footer>
      </div>
    </div>}
  </main>
}
