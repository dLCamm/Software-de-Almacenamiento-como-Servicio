import { getFileExtension, getFileKind } from '../fileTypes'
import { formatBytes, getTemporaryRemainingLabel } from '../formatters'
import Icon from './Icon'

export default function FileCard({ file, layout, onDownload, onMenu, menuOpen, onShare, onDelete }) {
  const kind = getFileKind(file.extension || getFileExtension(file.nombre_original))
  const temporaryRemaining = file.es_temporal && file.fecha_expiracion
    ? getTemporaryRemainingLabel(file.fecha_expiracion)
    : null
  return <article className={`drive-item drive-item--file ${layout === 'list' ? 'is-list' : ''} ${menuOpen ? 'is-menu-open' : ''}`}>
    <button className="drive-item__open" type="button" onClick={() => onDownload(file)} aria-label={`Descargar ${file.nombre_original}`}>
      <Icon name={kind} size={51} />
      <span className="drive-item__details">
        <span className="drive-item__name">{file.nombre_original}</span>
        {temporaryRemaining && <span className="temporary-tag">◷ Temporal · {temporaryRemaining}</span>}
      </span>
      <span className="drive-item__metadata">{file.tamano_legible || formatBytes(file.tamano_bytes)}</span>
    </button>
    <button className="item-menu-trigger" type="button" onClick={(event) => { event.stopPropagation(); onMenu() }} aria-label={`Opciones de ${file.nombre_original}`} aria-expanded={menuOpen}><Icon name="more" /></button>
    {menuOpen && <div className="item-menu" onClick={(event) => event.stopPropagation()}>
      <button type="button" onClick={() => onDownload(file)}><Icon name="download" size={16} />Descargar</button>
      <button type="button" onClick={() => onShare(file)}><Icon name="share" size={16} />Compartir enlace</button>
      {!file.es_temporal && <button className="item-menu__unavailable" type="button" disabled title="El backend permite definir archivos temporales al subirlos, pero no cambiar un archivo existente."><span aria-hidden="true">◷</span>Marcar como temporal <small>No disponible</small></button>}
      <button type="button" className="is-danger" onClick={() => onDelete(file)}><Icon name="trash" size={16} />Mover a papelera</button>
    </div>}
  </article>
}
