import { useEffect, useState } from 'react'
import { ACCEPTED_FILE_TYPES, getFileExtension, SUPPORTED_EXTENSIONS } from './fileTypes'

function getErrorMessage(error) {
  return error?.message || 'Ocurrió un error al comunicarse con el servidor.'
}

/**
 * Lógica y estado de la unidad. `storageApi` es un puerto de operaciones que
 * DashboardPage inyecta, de modo que este hook no depende de un cliente HTTP
 * concreto y puede recibir una implementación de prueba si se necesita.
 */
export default function useDashboard(storageApi) {
  const [folderStack, setFolderStack] = useState([])
  const [files, setFiles] = useState([])
  const [folders, setFolders] = useState([])
  const [usage, setUsage] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [openMenu, setOpenMenu] = useState('')
  const [dialog, setDialog] = useState(null)
  const [dialogName, setDialogName] = useState('')
  const [dialogBusy, setDialogBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const currentFolder = folderStack.at(-1) ?? null
  const currentFolderId = currentFolder?.id ?? null
  const visibleFolders = folders.filter((folder) => folder.nombre.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))

  useEffect(() => {
    let ignored = false
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const [nextFiles, nextFolders, nextUsage] = await Promise.all([
          storageApi.listFiles({ folderId: currentFolderId ?? 'root', query: search }),
          storageApi.listFolders(currentFolderId),
          storageApi.getStorageUsage(),
        ])
        if (!ignored) {
          setFiles(Array.isArray(nextFiles) ? nextFiles : [])
          setFolders(Array.isArray(nextFolders) ? nextFolders : [])
          setUsage(nextUsage)
        }
      } catch (requestError) {
        if (!ignored) setError(getErrorMessage(requestError))
      } finally {
        if (!ignored) setLoading(false)
      }
    }, search ? 220 : 0)
    return () => { ignored = true; window.clearTimeout(timer) }
  }, [currentFolderId, refreshKey, search, storageApi])

  function refresh() {
    setRefreshKey((key) => key + 1)
  }

  function clearError() {
    setError('')
  }

  function clearNotice() {
    setNotice('')
  }

  function toggleMenu(menuId) {
    setOpenMenu((current) => current === menuId ? '' : menuId)
  }

  function closeDialog() {
    setDialog(null)
  }

  function showFolderDialog(type, folder = null) {
    setDialogName(folder?.nombre ?? '')
    setDialog({ type, folder })
    setOpenMenu('')
  }

  function openFolder(folder) {
    setFolderStack((stack) => [...stack, { id: folder.id, name: folder.nombre }])
    setSearch('')
    setOpenMenu('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goToRoot() {
    setFolderStack([])
    setSearch('')
  }

  async function acceptFiles(fileList) {
    const selected = Array.from(fileList ?? [])
    if (!selected.length) return
    if (selected.length > 1) {
      setError('Sube un archivo a la vez para comprobar su formato y disponibilidad.')
      return
    }
    const file = selected[0]
    const extension = getFileExtension(file.name)
    if (!SUPPORTED_EXTENSIONS.has(extension)) {
      setDialog({ type: 'rejected', fileName: file.name })
      return
    }
    setUploading(true)
    setError('')
    setNotice('')
    try {
      await storageApi.uploadFile(file, currentFolderId)
      setNotice(`${file.name} se subió correctamente.`)
      refresh()
    } catch (uploadError) {
      setError(getErrorMessage(uploadError))
    } finally {
      setUploading(false)
    }
  }

  async function saveFolder(event) {
    event.preventDefault()
    if (!dialogName.trim()) return
    setDialogBusy(true)
    setError('')
    try {
      const isRename = dialog.type === 'rename'
      if (isRename) await storageApi.renameFolder(dialog.folder.id, dialogName.trim())
      else await storageApi.createFolder(dialogName.trim(), currentFolderId)
      setDialog(null)
      setDialogName('')
      setNotice(isRename ? 'La carpeta se renombró correctamente.' : 'La carpeta se creó correctamente.')
      refresh()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setDialogBusy(false)
    }
  }

  async function deleteFile(file) {
    setOpenMenu('')
    if (!window.confirm(`¿Mover “${file.nombre_original}” a la papelera?`)) return
    try {
      await storageApi.deleteFile(file.id)
      setNotice('El archivo se movió a la papelera.')
      refresh()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    }
  }

  async function deleteFolder(folder) {
    setOpenMenu('')
    if (!window.confirm(`¿Mover la carpeta “${folder.nombre}” a la papelera?`)) return
    try {
      await storageApi.deleteFolder(folder.id)
      setNotice('La carpeta se movió a la papelera.')
      refresh()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    }
  }

  async function downloadFile(file) {
    setOpenMenu('')
    try {
      const blob = await storageApi.downloadFile(file.id)
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = file.nombre_original
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    }
  }

  async function shareFile(file) {
    setOpenMenu('')
    try {
      const result = await storageApi.shareFile(file.id)
      setCopied(false)
      setDialog({ type: 'share', url: storageApi.toBrowserAccessibleShareUrl(result.download_url), expiresInSeconds: result.expira_en_segundos })
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    }
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(dialog.url)
      setCopied(true)
    } catch {
      setError('No se pudo copiar el enlace. Selecciónalo y cópialo manualmente.')
    }
  }

  return {
    acceptedFileTypes: ACCEPTED_FILE_TYPES,
    currentFolder,
    files,
    visibleFolders,
    usage,
    search,
    setSearch,
    loading,
    uploading,
    error,
    clearError,
    notice,
    clearNotice,
    openMenu,
    setOpenMenu,
    toggleMenu,
    dialog,
    dialogName,
    setDialogName,
    dialogBusy,
    copied,
    acceptFiles,
    saveFolder,
    deleteFile,
    deleteFolder,
    downloadFile,
    shareFile,
    copyShareLink,
    openFolder,
    goToRoot,
    showFolderDialog,
    closeDialog,
  }
}
