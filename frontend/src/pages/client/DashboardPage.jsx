import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfile } from '../../api/auth'
import * as storageApi from '../../api/storage'
import DashboardModal from './dashboard/components/DashboardModal'
import FileCard from './dashboard/components/FileCard'
import FilePreview from './dashboard/components/FilePreview'
import FolderCard from './dashboard/components/FolderCard'
import Icon from './dashboard/components/Icon'
import StorageBar from './dashboard/components/StorageBar'
import { SUPPORTED_FILE_TYPES, getFileKind } from './dashboard/fileTypes'
import { formatBytes, formatDateTime, getTrashDaysRemaining } from './dashboard/formatters'
import useDashboard from './dashboard/useDashboard'
import './DashboardPage.css'

function FileSkeletonGrid({ layout }) {
  const isList = layout === 'list'
  const skeletonCount = isList ? 6 : 8

  return <div className={`drive-grid drive-grid--skeleton ${isList ? 'drive-grid--list' : ''}`} role="status" aria-label="Cargando archivos" aria-busy="true">
    {Array.from({ length: skeletonCount }, (_, index) => <article key={index} className={`drive-item file-skeleton ${isList ? 'is-list' : ''}`} aria-hidden="true">
      <span className="file-skeleton__shape file-skeleton__icon" />
      <span className="file-skeleton__details">
        <span className="file-skeleton__shape file-skeleton__name" />
        <span className="file-skeleton__shape file-skeleton__subtitle" />
      </span>
      <span className="file-skeleton__shape file-skeleton__metadata" />
    </article>)}
  </div>
}

function getInitials(account) {
  const parts = [account.first_name, account.last_name].filter(Boolean)
  const letters = parts.length ? parts.map((part) => part.trim()[0]) : [account.email?.[0]]
  return letters.join('').slice(0, 2).toUpperCase()
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const uploadInput = useRef(null)
  const [layout, setLayout] = useState('grid')
  const [dragging, setDragging] = useState(false)
  const [account, setAccount] = useState(null)
  const [accountError, setAccountError] = useState('')

  // DashboardPage actúa como punto de composición e inyecta el adaptador API.
  const dashboard = useDashboard(storageApi)
  const { setOpenMenu } = dashboard
  const [previewFile, setPreviewFile] = useState(null)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const activeOptions = (dashboard.extensionFilter ? 1 : 0) + (dashboard.uploadTemporary ? 1 : 0)
  const closePreview = useCallback(() => setPreviewFile(null), [])
  const openPreview = useCallback((file) => { setOpenMenu(''); setPreviewFile(file) }, [setOpenMenu])

  useEffect(() => {
    let active = true
    getProfile()
      .then((profile) => {
        if (active) setAccount(profile)
      })
      .catch((error) => {
        if (active) setAccountError(error.message)
      })
    return () => { active = false }
  }, [])

  function handleDrop(event) {
    event.preventDefault()
    setDragging(false)
    if (dashboard.showTrash) return
    dashboard.acceptFiles(event.dataTransfer.files)
  }

  async function handleFileSelection(event) {
    await dashboard.acceptFiles(event.target.files)
    event.target.value = ''
  }

  return <main className="dashboard-page" onClick={() => dashboard.setOpenMenu('')} onDragOver={(event) => { event.preventDefault(); if (!dashboard.showTrash && event.dataTransfer?.types.includes('Files')) setDragging(true) }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false) }} onDrop={handleDrop}>
    <header className={`dashboard-toolbar${optionsOpen ? ' is-options-open' : ''}`}>
      {dashboard.showTrash
        ? <div className="toolbar-actions"><button className="toolbar-button toolbar-button--secondary" type="button" onClick={dashboard.closeTrash}><Icon name="back" />Volver a mis archivos</button></div>
        : <>
          <label className="drive-search"><Icon name="search" /><input type="search" value={dashboard.search} onChange={(event) => dashboard.setSearch(event.target.value)} placeholder="Buscar archivos y carpetas..." aria-label="Buscar archivos y carpetas" /></label>
          {/* En celular, filtros, vista y papelera se agrupan en este menú desplegable. */}
          <button className="toolbar-options-toggle" type="button" onClick={(event) => { event.stopPropagation(); setOptionsOpen((value) => !value) }} aria-expanded={optionsOpen} aria-controls="toolbar-options">
            <Icon name="sliders" /><span>Opciones</span>{activeOptions > 0 && <span className="toolbar-options-toggle__count" aria-label={`${activeOptions} activas`}>{activeOptions}</span>}
          </button>
          <div id="toolbar-options" className="toolbar-options" onClick={(event) => event.stopPropagation()}>
            <label className="drive-filter"><span>Tipo</span><select value={dashboard.extensionFilter} onChange={(event) => dashboard.setExtensionFilter(event.target.value)} aria-label="Filtrar por tipo de archivo"><option value="">Todos</option>{Object.entries(SUPPORTED_FILE_TYPES).map(([extension, config]) => <option key={extension} value={extension}>{config.label}</option>)}</select></label>
            {dashboard.canUploadTemporary && <div className="upload-options"><label className="checkbox-inline"><input type="checkbox" checked={dashboard.uploadTemporary} onChange={(event) => dashboard.setUploadTemporary(event.target.checked)} />Subida temporal</label>{dashboard.uploadTemporary && <label className="ttl-field">Días<input type="number" min="1" max="365" value={dashboard.uploadTtlDays} onChange={(event) => dashboard.setUploadTtlDays(Math.min(365, Math.max(1, Number(event.target.value) || 14)))} /></label>}</div>}
            <div className="view-toggle" role="group" aria-label="Vista de archivos"><button type="button" className={layout === 'grid' ? 'is-active' : ''} onClick={() => setLayout('grid')} aria-label="Vista de cuadrícula" aria-pressed={layout === 'grid'}><Icon name="grid" /></button><button type="button" className={layout === 'list' ? 'is-active' : ''} onClick={() => setLayout('list')} aria-label="Vista de lista" aria-pressed={layout === 'list'}><Icon name="list" /></button></div>
            <button className="toolbar-button toolbar-button--secondary toolbar-trash" type="button" title="Papelera" onClick={() => { setOptionsOpen(false); dashboard.openTrash() }}><Icon name="trash" /><span>Papelera</span></button>
          </div>
          <div className="toolbar-actions">
            <button className="toolbar-button toolbar-button--primary" type="button" onClick={() => uploadInput.current?.click()} disabled={dashboard.uploading}><Icon name="upload" />{dashboard.uploading ? 'Subiendo…' : 'Subir archivo'}</button>
            <button className="toolbar-button toolbar-button--secondary" type="button" onClick={() => dashboard.showFolderDialog('create')}><Icon name="folderAdd" /><span>Nueva carpeta</span></button>
          </div>
          <input ref={uploadInput} className="visually-hidden" type="file" accept={dashboard.acceptedFileTypes} multiple onChange={handleFileSelection} />
        </>}
    </header>

    <section className="dashboard-hero">
      {!account && !accountError && <div className="dashboard-welcome" aria-hidden="true"><span className="file-skeleton__shape dashboard-welcome__avatar" /><div className="dashboard-welcome__text"><span className="file-skeleton__shape dashboard-account__skeleton" /><span className="file-skeleton__shape dashboard-account__skeleton dashboard-account__skeleton--short" /></div></div>}
      {account && <div className="dashboard-welcome">
        <span className="dashboard-welcome__avatar" aria-hidden="true">{getInitials(account)}</span>
        <div className="dashboard-welcome__text">
          <h1>Hola, {account.first_name || account.email.split('@')[0]} <span aria-hidden="true">👋</span></h1>
          <p>{account.email}</p>
        </div>
      </div>}
      {accountError && <div className="dashboard-alert dashboard-alert--error" role="alert">{accountError}</div>}
      <StorageBar usage={dashboard.usage} onUpgrade={() => navigate('/app/client/billing')} />
    </section>

    <section className="folder-content" aria-label="Contenido de la unidad">
      <div className="folder-heading">{dashboard.showTrash ? <span className="breadcrumb-current">PAPELERA</span> : <nav className="folder-path" aria-label="Ruta de la carpeta">
        <ol>
          <li><button type="button" className={`folder-path__item folder-path__root${dashboard.currentFolder ? '' : ' is-current'}`} onClick={dashboard.goToRoot} aria-current={dashboard.currentFolder ? undefined : 'page'}><Icon name="home" size={16} /><span>Mis archivos</span></button></li>
          {dashboard.folderStack.map((folder, index) => {
            const isLast = index === dashboard.folderStack.length - 1
            return <li key={folder.id}>
              <span className="folder-path__separator" aria-hidden="true"><Icon name="chevron" size={15} /></span>
              <button type="button" className={`folder-path__item${isLast ? ' is-current' : ''}`} onClick={() => !isLast && dashboard.goToFolderIndex(index)} aria-current={isLast ? 'page' : undefined} title={folder.name}><Icon name="folder" size={15} /><span>{folder.name}</span></button>
            </li>
          })}
        </ol>
      </nav>}</div>
      {dashboard.showTrash && <div className="trash-toolbar">
        <p className="trash-description">Los elementos se eliminan automáticamente después de 30 días. Puedes restaurarlos mientras permanezcan aquí.</p>
        {dashboard.trashItems.length > 0 && <div className="trash-toolbar__actions">
          <button type="button" onClick={dashboard.restoreAllTrash} disabled={dashboard.trashBusy}><Icon name="restore" size={16} />Restaurar todo</button>
          <button type="button" className="is-danger" onClick={dashboard.emptyTrash} disabled={dashboard.trashBusy}><Icon name="trash" size={16} />{dashboard.trashBusy ? 'Procesando…' : 'Vaciar papelera'}</button>
        </div>}
      </div>}
      {dashboard.error && <div className="dashboard-alert dashboard-alert--error" role="alert"><span>{dashboard.error}</span><button type="button" onClick={dashboard.clearError} aria-label="Cerrar mensaje"><Icon name="x" size={16} /></button></div>}
      {dashboard.uploadErrors.length > 0 && <div className="dashboard-alert dashboard-alert--error" role="alert"><span>No se pudieron subir: {dashboard.uploadErrors.join(' ')}</span><button type="button" onClick={() => dashboard.clearUploadErrors()} aria-label="Cerrar errores de carga"><Icon name="x" size={16} /></button></div>}
      {dashboard.notice && <div className="dashboard-alert dashboard-alert--success" role="status"><Icon name="check" size={17} /><span>{dashboard.notice}</span><button type="button" onClick={dashboard.clearNotice} aria-label="Cerrar mensaje"><Icon name="x" size={16} /></button></div>}

      {dashboard.loading && !dashboard.showTrash ? <FileSkeletonGrid layout={layout} /> : dashboard.loading ? <div className="drive-loading" role="status"><span className="loading-spinner" />Cargando papelera…</div> : dashboard.showTrash ? <div className="trash-list">
        {dashboard.trashItems.map((item) => {
          const daysRemaining = getTrashDaysRemaining(item.fecha_eliminacion)
          const icon = item.tipo === 'carpeta' ? 'folder' : getFileKind(item.extension)
          return <article className="trash-entry" key={`${item.tipo}:${item.id}`}>
            <Icon name={icon} size={29} />
            <div className="trash-entry__details">
              <strong>{item.nombre}</strong>
              <span>{item.tipo === 'carpeta' ? 'Carpeta y contenido' : formatBytes(item.tamano_bytes)}</span>
              <span>{daysRemaining === null ? 'Fecha de eliminación no disponible' : daysRemaining === 0 ? 'Lista para eliminarse definitivamente' : `Se eliminará en ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'}`}</span>
              <span>Eliminación: {formatDateTime(item.fecha_eliminacion)}</span>
            </div>
            <div className="trash-entry__actions">
              <button type="button" onClick={() => dashboard.restoreTrashItem(item)}>Restaurar</button>
              <button type="button" className="is-danger" onClick={() => dashboard.deleteTrashItem(item)}>Eliminar definitivamente</button>
            </div>
          </article>
        })}
        {!dashboard.trashItems.length && <div className="empty-state"><Icon name="trash" size={44} /><h2>La papelera está vacía</h2><p>Los archivos y carpetas que elimines aparecerán aquí durante 30 días.</p></div>}
      </div> : <div className={`drive-grid ${layout === 'list' ? 'drive-grid--list' : ''}`}>
        {dashboard.visibleFolders.map((folder) => <FolderCard key={folder.id} folder={folder} layout={layout} onOpen={dashboard.openFolder} menuOpen={dashboard.openMenu === `folder:${folder.id}`} onMenu={() => dashboard.toggleMenu(`folder:${folder.id}`)} onRename={(item) => dashboard.showFolderDialog('rename', item)} onDelete={dashboard.deleteFolder} />)}
        {dashboard.files.map((file) => <FileCard key={file.id} file={file} layout={layout} onDownload={dashboard.downloadFile} onPreview={openPreview} menuOpen={dashboard.openMenu === `file:${file.id}`} onMenu={() => dashboard.toggleMenu(`file:${file.id}`)} canShare={dashboard.canShareLinks} onShare={dashboard.shareFile} onRename={(item) => dashboard.showFileDialog('rename-file', item)} onDelete={dashboard.deleteFile} />)}
        {!dashboard.visibleFolders.length && !dashboard.files.length && <div className="empty-state"><Icon name="folder" size={44} /><h2>{dashboard.search ? 'No encontramos coincidencias' : 'La carpeta está vacía'}</h2><p>{dashboard.search ? 'Prueba con otro nombre de archivo o carpeta.' : 'Arrastra un archivo aquí o crea una carpeta para comenzar.'}</p>{!dashboard.search && <button className="empty-state__button" type="button" onClick={() => uploadInput.current?.click()}><Icon name="upload" size={17} />Subir archivo</button>}</div>}
      </div>}
    </section>

    <footer className="dashboard-footer"><span>Kubo · Tu almacenamiento en la nube</span></footer>

    {dragging && <div className="drop-overlay" aria-live="polite"><div className="drop-overlay__card"><span className="drop-overlay__icon"><Icon name="upload" size={32} /></span><strong>Suelta el archivo para subirlo</strong><span>PDF, MP3, DOC, DOCX o PNG</span></div></div>}
    <FilePreview file={previewFile} loadFile={storageApi.downloadFile} onDownload={dashboard.downloadFile} onClose={closePreview} />
    <DashboardModal dialog={dashboard.dialog} name={dashboard.dialogName} setName={dashboard.setDialogName} onClose={dashboard.closeDialog} onSubmit={dashboard.dialog?.type === 'rename-file' ? dashboard.saveFile : dashboard.saveFolder} busy={dashboard.dialogBusy} onCopy={dashboard.copyShareLink} copied={dashboard.copied} onCreateShare={dashboard.createShareLink} />
  </main>
}
