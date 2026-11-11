import Icon from './Icon'
import { SUPPORTED_FILE_LABELS } from '../fileTypes'
import ShareDurationPicker from './ShareDurationPicker'
import { formatShareDuration } from '../shareDuration'

export default function DashboardModal({ dialog, name, setName, onClose, onSubmit, busy, onCopy, copied, onCreateShare }) {
  if (!dialog) return null
  const isShare = dialog.type === 'share'
  const isShareSetup = dialog.type === 'share-setup'
  const isRejected = dialog.type === 'rejected'
  const isRenameFile = dialog.type === 'rename-file'
  const title = isShareSetup ? 'Compartir archivo' : isShare ? 'Enlace para compartir' : isRejected ? 'Formato no compatible' : isRenameFile ? 'Renombrar archivo' : dialog.type === 'rename' ? 'Renombrar carpeta' : 'Crear carpeta'
  const isRename = isRenameFile || dialog.type === 'rename'
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className={`dashboard-dialog${isRejected ? ' dashboard-dialog--rejected' : ''}`} role="dialog" aria-modal="true" aria-labelledby="dashboard-dialog-title">
      <button className="dialog-close" type="button" onClick={onClose} aria-label="Cerrar"><Icon name="x" /></button>
      {isRejected && <div className="rejected-mark"><Icon name="x" size={60} /></div>}
      <h2 id="dashboard-dialog-title">{title}</h2>
      {isRejected ? <><p><strong>{dialog.fileName}</strong> no se puede subir. Kubo acepta archivos {SUPPORTED_FILE_LABELS}.</p><button className="dialog-primary" type="button" onClick={onClose}>Entendido</button></> : null}
      {isShare ? <><p>El enlace temporal se creó correctamente. Estará disponible durante <strong>{formatShareDuration(dialog.expiresInSeconds || 604800)}</strong>.</p><div className="share-link-field"><input readOnly value={dialog.url} aria-label="Enlace para compartir" /><button type="button" onClick={onCopy}><Icon name={copied ? 'check' : 'copy'} size={18} />{copied ? 'Copiado' : 'Copiar'}</button></div><button className="dialog-secondary" type="button" onClick={onClose}>Cerrar</button></> : null}
      {isShareSetup ? <ShareDurationPicker fileName={dialog.file?.nombre_original} busy={busy} onCancel={onClose} onConfirm={onCreateShare} /> : null}
      {!isRejected && !isShare && !isShareSetup && <form onSubmit={onSubmit}><label className="dialog-label" htmlFor="item-name">{isRenameFile ? 'Nombre del archivo' : 'Nombre de la carpeta'}</label><input id="item-name" className="dialog-input" autoFocus maxLength={255} value={name} onChange={(event) => setName(event.target.value)} placeholder={isRenameFile ? 'Ej. informe.pdf' : 'Ej. Proyectos 2026'} />{isRenameFile && <p className="dialog-hint">Conserva la extensión original del archivo.</p>}<div className="dialog-actions"><button className="dialog-secondary" type="button" onClick={onClose}>Cancelar</button><button className="dialog-primary" type="submit" disabled={busy || !name.trim()}>{busy ? 'Guardando…' : isRename ? 'Guardar cambios' : 'Crear carpeta'}</button></div></form>}
    </section>
  </div>
}
