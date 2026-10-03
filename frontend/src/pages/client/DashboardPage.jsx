import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../../api/auth'
import * as storageApi from '../../api/storage'
import DashboardModal from './dashboard/components/DashboardModal'
import FileCard from './dashboard/components/FileCard'
import FolderCard from './dashboard/components/FolderCard'
import Icon from './dashboard/components/Icon'
import StorageBar from './dashboard/components/StorageBar'
import useDashboard from './dashboard/useDashboard'
import './DashboardPage.css'

export default function DashboardPage() {
  const navigate = useNavigate()
  const uploadInput = useRef(null)
  const [layout, setLayout] = useState('grid')
  const [dragging, setDragging] = useState(false)

  // DashboardPage actúa como punto de composición e inyecta el adaptador API.
  const dashboard = useDashboard(storageApi)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function handleDrop(event) {
    event.preventDefault()
    setDragging(false)
    dashboard.acceptFiles(event.dataTransfer.files)
  }

  async function handleFileSelection(event) {
    await dashboard.acceptFiles(event.target.files)
    event.target.value = ''
  }

  return <main className="dashboard-page" onClick={() => dashboard.setOpenMenu('')} onDragOver={(event) => { event.preventDefault(); if (event.dataTransfer?.types.includes('Files')) setDragging(true) }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false) }} onDrop={handleDrop}>
    <header className="dashboard-toolbar">
      <label className="drive-search"><Icon name="search" /><input type="search" value={dashboard.search} onChange={(event) => dashboard.setSearch(event.target.value)} placeholder="Buscar archivos y carpetas..." aria-label="Buscar archivos y carpetas" /></label>
      <div className="toolbar-actions">
        <button className="toolbar-button toolbar-button--primary" type="button" onClick={() => uploadInput.current?.click()} disabled={dashboard.uploading}><Icon name="upload" />{dashboard.uploading ? 'Subiendo…' : 'Subir archivo'}</button>
        <button className="toolbar-button toolbar-button--secondary" type="button" onClick={() => dashboard.showFolderDialog('create')}><Icon name="folderAdd" /><span>Nueva carpeta</span></button>
        <div className="view-toggle" role="group" aria-label="Vista de archivos"><button type="button" className={layout === 'grid' ? 'is-active' : ''} onClick={() => setLayout('grid')} aria-label="Vista de cuadrícula"><Icon name="grid" /></button><button type="button" className={layout === 'list' ? 'is-active' : ''} onClick={() => setLayout('list')} aria-label="Vista de lista"><Icon name="list" /></button></div>
      </div>
      <input ref={uploadInput} className="visually-hidden" type="file" accept={dashboard.acceptedFileTypes} onChange={handleFileSelection} />
    </header>

    <StorageBar usage={dashboard.usage} onUpgrade={() => {}} />

    <section className="folder-content" aria-label="Contenido de la unidad">
      <div className="folder-heading"><button type="button" className={dashboard.currentFolder ? 'breadcrumb-root' : 'breadcrumb-root is-current'} onClick={dashboard.goToRoot}>MI UNIDAD</button>{dashboard.currentFolder && <><span className="breadcrumb-separator">/</span><span className="breadcrumb-current">{dashboard.currentFolder.name}</span></>}</div>
      {dashboard.error && <div className="dashboard-alert dashboard-alert--error" role="alert"><span>{dashboard.error}</span><button type="button" onClick={dashboard.clearError} aria-label="Cerrar mensaje"><Icon name="x" size={16} /></button></div>}
      {dashboard.notice && <div className="dashboard-alert dashboard-alert--success" role="status"><Icon name="check" size={17} /><span>{dashboard.notice}</span><button type="button" onClick={dashboard.clearNotice} aria-label="Cerrar mensaje"><Icon name="x" size={16} /></button></div>}

      {dashboard.loading ? <div className="drive-loading" role="status"><span className="loading-spinner" />Cargando archivos…</div> : <div className={`drive-grid ${layout === 'list' ? 'drive-grid--list' : ''}`}>
        {dashboard.visibleFolders.map((folder) => <FolderCard key={folder.id} folder={folder} layout={layout} onOpen={dashboard.openFolder} menuOpen={dashboard.openMenu === `folder:${folder.id}`} onMenu={() => dashboard.toggleMenu(`folder:${folder.id}`)} onRename={(item) => dashboard.showFolderDialog('rename', item)} onDelete={dashboard.deleteFolder} />)}
        {dashboard.files.map((file) => <FileCard key={file.id} file={file} layout={layout} onDownload={dashboard.downloadFile} menuOpen={dashboard.openMenu === `file:${file.id}`} onMenu={() => dashboard.toggleMenu(`file:${file.id}`)} onShare={dashboard.shareFile} onDelete={dashboard.deleteFile} />)}
        {!dashboard.visibleFolders.length && !dashboard.files.length && <div className="empty-state"><span className="empty-state__watermark">{dashboard.search ? 'Sin resultados' : 'La carpeta está vacía'}</span><Icon name="folder" size={44} /><h2>{dashboard.search ? 'No encontramos coincidencias' : 'La carpeta está vacía'}</h2><p>{dashboard.search ? 'Prueba con otro nombre de archivo o carpeta.' : 'Arrastra un archivo aquí o crea una carpeta para comenzar.'}</p>{!dashboard.search && <button className="empty-state__button" type="button" onClick={() => uploadInput.current?.click()}><Icon name="upload" size={17} />Subir archivo</button>}</div>}
      </div>}
    </section>

    <footer className="dashboard-footer"><span>Kubo · Tu almacenamiento en la nube</span><button type="button" onClick={handleLogout}>Cerrar sesión</button></footer>

    {dragging && <div className="drop-overlay" aria-live="polite"><div className="drop-overlay__card"><span className="drop-overlay__icon"><Icon name="upload" size={32} /></span><strong>Suelta el archivo para subirlo</strong><span>PDF, MP3, DOC, DOCX o PNG</span></div></div>}
    <DashboardModal dialog={dashboard.dialog} name={dashboard.dialogName} setName={dashboard.setDialogName} onClose={dashboard.closeDialog} onSubmit={dashboard.saveFolder} busy={dashboard.dialogBusy} onCopy={dashboard.copyShareLink} copied={dashboard.copied} />
  </main>
}
