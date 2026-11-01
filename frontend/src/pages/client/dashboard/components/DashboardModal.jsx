import Icon from './Icon'
import { SUPPORTED_FILE_LABELS } from '../fileTypes'

export default function DashboardModal({ dialog, name, setName, onClose, onSubmit, onConfirm, busy, onCopy, copied }) {
  if (!dialog) return null
  const isShare = dialog.type === 'share'
  const isRejected = dialog.type === 'rejected'
  const isConfirmation = dialog.type === 'confirm'
  const isRenameFile = dialog.type === 'rename-file'
  const title = isShare ? 'Enlace para compartir' : isRejected ? 'Formato no compatible' : isConfirmation ? dialog.title : isRenameFile ? 'Renombrar archivo' : dialog.type === 'rename' ? 'Renombrar carpeta' : 'Crear carpeta'
  const isRename = isRenameFile || dialog.type === 'rename'
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className={`dashboard-dialog${isRejected ? ' dashboard-dialog--rejected' : ''}${isConfirmation ? ' dashboard-dialog--confirmation' : ''}`} role={isConfirmation ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby="dashboard-dialog-title" aria-describedby={isConfirmation ? 'dashboard-confirmation-message' : undefined}>
      <button className="dialog-close" type="button" onClick={onClose} aria-label="Cerrar" disabled={busy}><Icon name="x" /></button>
      {isRejected && <div className="rejected-mark"><Icon name="x" size={60} /></div>}
      {isConfirmation && <div className="confirmation-mark"><Icon name="trash" size={25} /></div>}
      <h2 id="dashboard-dialog-title">{title}</h2>
      {isRejected ? <><p><strong>{dialog.fileName}</strong> no se puede subir. Kubo acepta archivos {SUPPORTED_FILE_LABELS}.</p><button className="dialog-primary" type="button" onClick={onClose}>Entendido</button></> : null}
      {isConfirmation && <><p id="dashboard-confirmation-message">{dialog.message}</p><div className="dialog-actions"><button className="dialog-secondary" type="button" onClick={onClose} disabled={busy}>Cancelar</button><button className="dialog-primary dialog-primary--danger" type="button" onClick={onConfirm} disabled={busy}>{busy ? 'Procesando…' : dialog.confirmLabel}</button></div></>}
      {isShare ? <><p>El enlace temporal se creó correctamente. Expira en {Math.floor((dialog.expiresInSeconds || 604800) / 86400)} días.</p><div className="share-link-field"><input readOnly value={dialog.url} aria-label="Enlace para compartir" /><button type="button" onClick={onCopy}><Icon name={copied ? 'check' : 'copy'} size={18} />{copied ? 'Copiado' : 'Copiar'}</button></div><button className="dialog-secondary" type="button" onClick={onClose}>Cerrar</button></> : null}
      {!isRejected && !isShare && !isConfirmation && <form onSubmit={onSubmit}><label className="dialog-label" htmlFor="item-name">{isRenameFile ? 'Nombre del archivo' : 'Nombre de la carpeta'}</label><input id="item-name" className="dialog-input" autoFocus maxLength={255} value={name} onChange={(event) => setName(event.target.value)} placeholder={isRenameFile ? 'Ej. informe.pdf' : 'Ej. Proyectos 2026'} />{isRenameFile && <p className="dialog-hint">Conserva la extensión original del archivo.</p>}<div className="dialog-actions"><button className="dialog-secondary" type="button" onClick={onClose}>Cancelar</button><button className="dialog-primary" type="submit" disabled={busy || !name.trim()}>{busy ? 'Guardando…' : isRename ? 'Guardar cambios' : 'Crear carpeta'}</button></div></form>}
    </section>
  </div>
}
