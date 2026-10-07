import { apiRequest } from './auth'

function withQuery(path, params) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value)
  })
  const suffix = query.toString()
  return suffix ? `${path}?${suffix}` : path
}

export function listFiles({ folderId, query } = {}) {
  return apiRequest(withQuery('/api/storage/files/', {
    carpeta_id: folderId ?? 'root',
    q: query?.trim(),
  }), { auth: true })
}

export function listFolders(parentId = null) {
  return apiRequest(withQuery('/api/storage/folders/', { parent_id: parentId }), { auth: true })
}

export function getStorageUsage() {
  return apiRequest('/api/storage/usage/', { auth: true })
}

export function listTrash() {
  return apiRequest('/api/storage/trash/', { auth: true })
}

export function restoreFile(fileId) {
  return apiRequest(`/api/storage/files/${fileId}/restore/`, {
    method: 'POST',
    auth: true,
  })
}

export function restoreFolder(folderId) {
  return apiRequest(`/api/storage/folders/${folderId}/restore/`, {
    method: 'POST',
    auth: true,
  })
}

export function uploadFile(file, folderId = null) {
  const formData = new FormData()
  formData.append('archivo', file)
  if (folderId) formData.append('carpeta_id', folderId)
  return apiRequest('/api/storage/files/upload/', {
    method: 'POST',
    body: formData,
    auth: true,
  })
}

export function createFolder(name, parentId = null) {
  return apiRequest('/api/storage/folders/', {
    method: 'POST',
    body: { nombre: name, carpeta_padre_id: parentId },
    auth: true,
  })
}

export function renameFolder(folderId, name) {
  return apiRequest(`/api/storage/folders/${folderId}/`, {
    method: 'PATCH',
    body: { nuevo_nombre: name },
    auth: true,
  })
}

export function deleteFolder(folderId, permanent = false) {
  const suffix = permanent ? '?permanente=true' : ''
  return apiRequest(`/api/storage/folders/${folderId}/${suffix}`, {
    method: 'DELETE',
    auth: true,
  })
}

export function deleteFile(fileId, permanent = false) {
  const suffix = permanent ? '?permanente=true' : ''
  return apiRequest(`/api/storage/files/${fileId}/${suffix}`, {
    method: 'DELETE',
    auth: true,
  })
}

export function downloadFile(fileId) {
  return apiRequest(`/api/storage/files/${fileId}/download/`, {
    method: 'GET',
    auth: true,
    responseType: 'blob',
  })
}

export function shareFile(fileId) {
  return apiRequest(`/api/storage/files/${fileId}/share/`, {
    method: 'POST',
    // MinIO admite URLs prefirmadas por un máximo de 7 días. El endpoint
    // usa 14 días por defecto, así que enviamos una duración compatible.
    body: { expiracion_segundos: 7 * 24 * 60 * 60 },
    auth: true,
  })
}

export function toBrowserAccessibleShareUrl(downloadUrl) {
  const signedUrl = new URL(downloadUrl)

  // El host "minio" solo es resoluble dentro de la red Docker. El frontend
  // lo publica bajo su propio origen y su proxy conserva Host: minio:9000,
  // que forma parte de la firma del enlace prefirmado.
  if (signedUrl.hostname !== 'minio') return signedUrl.toString()

  signedUrl.pathname = `/minio${signedUrl.pathname}`
  return `${window.location.origin}${signedUrl.pathname}${signedUrl.search}`
}

function getSignedUrlExpiration(downloadUrl, fallbackSeconds) {
  try {
    const signedUrl = new URL(downloadUrl)
    const signedAtValue = signedUrl.searchParams.get('X-Amz-Date') || signedUrl.searchParams.get('x-amz-date')
    const lifetimeValue = signedUrl.searchParams.get('X-Amz-Expires') || signedUrl.searchParams.get('x-amz-expires')
    const signedAtMatch = signedAtValue?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/)
    const lifetimeSeconds = Number(lifetimeValue)
    if (signedAtMatch && Number.isFinite(lifetimeSeconds) && lifetimeSeconds > 0) {
      const [, year, month, day, hour, minute, second] = signedAtMatch
      const signedAt = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))
      return signedAt + lifetimeSeconds * 1000
    }
  } catch {
    // Use the duration returned by the API if the storage URL has no parseable expiry.
  }
  return Date.now() + fallbackSeconds * 1000
}

export function createSharePageUrl(downloadUrl, fileName, expiresInSeconds) {
  const sharePageUrl = new URL('/share', window.location.origin)
  sharePageUrl.searchParams.set('download', toBrowserAccessibleShareUrl(downloadUrl))
  sharePageUrl.searchParams.set('name', fileName)
  sharePageUrl.searchParams.set('expires_at', String(getSignedUrlExpiration(downloadUrl, expiresInSeconds)))
  return sharePageUrl.toString()
}
