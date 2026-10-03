import Icon from './Icon'

export default function FolderCard({ folder, layout, onOpen, onMenu, menuOpen, onRename, onDelete }) {
  return <article className={`drive-item drive-item--folder ${layout === 'list' ? 'is-list' : ''}`}>
    <button className="drive-item__open" type="button" onClick={() => onOpen(folder)} aria-label={`Abrir carpeta ${folder.nombre}`}>
      <Icon name="folder" size={51} />
      <span className="drive-item__name">{folder.nombre}</span>
      {layout === 'list' && <span className="drive-item__metadata">{folder.archivos_count ?? 0} archivos · {folder.subcarpetas_count ?? 0} carpetas</span>}
    </button>
    <button className="item-menu-trigger" type="button" onClick={(event) => { event.stopPropagation(); onMenu() }} aria-label={`Opciones de ${folder.nombre}`} aria-expanded={menuOpen}><Icon name="more" /></button>
    {menuOpen && <div className="item-menu" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => onRename(folder)}><Icon name="rename" size={16} />Renombrar</button><button type="button" className="is-danger" onClick={() => onDelete(folder)}><Icon name="trash" size={16} />Mover a papelera</button></div>}
  </article>
}
