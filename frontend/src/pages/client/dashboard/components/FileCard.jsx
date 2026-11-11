import { getFileExtension, getFileKind, getPreviewType } from '../fileTypes'
import { formatBytes, getTemporaryRemainingLabel } from '../formatters'
import Icon from './Icon'

export default function FileCard({ file, layout, onDownload, onPreview, onMenu, menuOpen, canShare = false, onShare, onRename, onDelete }) {
  const kind = getFileKind(file.extension || getFileExtension(file.nombre_original))
  const temporaryRemaining = file.es_temporal && file.fecha_expiracion
    ? getTemporaryRemainingLabel(file.fecha_expiracion)
    : null
  const canPreview = Boolean(onPreview && getPreviewType(file))
  const openFile = () => (canPreview ? onPreview(file) : onDownload(file))
  return <article className={`drive-item drive-item--file ${layout === 'list' ? 'is-list' : ''} ${menuOpen ? 'is-menu-open' : ''}`}>
    <button className="drive-item__open" type="button" onClick={openFile} aria-label={`${canPreview ? "Ver" : "Descargar"} ${file.nombre_original}`}>
      <Icon name={kind} size={51} />
      <span className="drive-item__details">
        <span className="drive-item__name">{file.nombre_original}</span>
        {temporaryRemaining && <span className="temporary-tag">◷ Temporal · {temporaryRemaining}</span>}
      </span>
      <span className="drive-item__metadata">{file.tamano_legible || formatBytes(file.tamano_bytes)}</span>
    </button>
    <button className="item-menu-trigger" type="button" onClick={(event) => { event.stopPropagation(); onMenu() }} aria-label={`Opciones de ${file.nombre_original}`} aria-expanded={menuOpen}><Icon name="more" /></button>
    {menuOpen && <div className="item-menu" onClick={(event) => event.stopPropagation()}>
      {canPreview && <button type="button" onClick={() => onPreview(file)}><Icon name="eye" size={16} />Vista previa</button>}
      <button type="button" onClick={() => onDownload(file)}><Icon name="download" size={16} />Descargar</button>
      {canShare && <button type="button" onClick={() => onShare(file)}><Icon name="share" size={16} />Compartir enlace</button>}
      <button type="button" onClick={() => onRename(file)}><Icon name="rename" size={16} />Renombrar</button>
      <button type="button" className="is-danger" onClick={() => onDelete(file)}><Icon name="trash" size={16} />Mover a papelera</button>
    </div>}
  </article>
}
