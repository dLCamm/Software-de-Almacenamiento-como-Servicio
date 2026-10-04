export const SUPPORTED_FILE_TYPES = {
  pdf: { kind: 'pdf', label: 'PDF', accept: ['.pdf', 'application/pdf'] },
  mp3: { kind: 'mp3', label: 'MP3', accept: ['.mp3', 'audio/mpeg'] },
  doc: { kind: 'doc', label: 'DOC', accept: ['.doc', 'application/msword'] },
  docx: { kind: 'doc', label: 'DOCX', accept: ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] },
  png: { kind: 'png', label: 'PNG', accept: ['.png', 'image/png'] },
}

export const SUPPORTED_EXTENSIONS = new Set(Object.keys(SUPPORTED_FILE_TYPES))
export const ACCEPTED_FILE_TYPES = Object.values(SUPPORTED_FILE_TYPES)
  .flatMap(({ accept }) => accept)
  .join(',')
export const SUPPORTED_FILE_LABELS = Object.values(SUPPORTED_FILE_TYPES)
  .map(({ label }) => label)
  .join(', ')

export function getFileExtension(fileName = '') {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

export function getFileKind(extension = '') {
  return SUPPORTED_FILE_TYPES[extension]?.kind ?? 'doc'
}
