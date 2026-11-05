import { useEffect, useRef, useState } from 'react'
import { PREVIEW_TYPES, getPreviewType } from '../fileTypes'
import { formatBytes } from '../formatters'
import Icon from './Icon'

/** Ventana de vista previa para PNG, PDF y MP3. Descarga el archivo en memoria y lo muestra. */
export default function FilePreview({ file, loadFile, onDownload, onClose }) {
  const type = getPreviewType(file)
  const [state, setState] = useState({ url: '', error: '' })
  const closeButton = useRef(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!file || !type) return undefined
    let active = true
    let objectUrl = ''
    loadFile(file.id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(new Blob([blob], { type: PREVIEW_TYPES[type] }))
        if (active) setState({ url: objectUrl, error: '' })
        else URL.revokeObjectURL(objectUrl)
      })
      .catch((error) => { if (active) setState({ url: '', error: error?.message || 'No se pudo abrir la vista previa.' }) })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setState({ url: '', error: '' })
    }
  }, [file, type, loadFile])

  useEffect(() => {
    if (!file) return undefined
    closeButton.current?.focus()
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [file, onClose])

  if (!file || !type) return null
  const name = file.nombre_original

  return <div className="preview-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className={`file-preview file-preview--${type}`} role="dialog" aria-modal="true" aria-labelledby="file-preview-title">
      <header className="file-preview__header">
        <Icon name={type} size={26} />
        <div className="file-preview__title">
          <h2 id="file-preview-title" title={name}>{name}</h2>
          <span>{file.tamano_legible || formatBytes(file.tamano_bytes)}</span>
        </div>
        <button className="file-preview__download" type="button" onClick={() => onDownload(file)}><Icon name="download" size={18} /><span>Descargar</span></button>
        <button ref={closeButton} className="file-preview__close" type="button" onClick={onClose} aria-label="Cerrar vista previa"><Icon name="x" /></button>
      </header>

      <div className="file-preview__body">
        {state.error
          ? <div className="file-preview__message" role="alert"><p>{state.error}</p><button type="button" onClick={() => onDownload(file)}>Descargar archivo</button></div>
          : !state.url
            ? <div className="file-preview__message" role="status"><span className="loading-spinner" />Cargando vista previa…</div>
            : type === 'png'
              ? <img src={state.url} alt={`Vista previa de ${name}`} />
              : type === 'pdf'
                ? <iframe src={state.url} title={`Vista previa de ${name}`} />
                : <div className="file-preview__audio">
                    <span className={`file-preview__disc${playing ? " is-playing" : ""}`} aria-hidden="true"><Icon name="mp3" size={120} /></span>
                    <audio src={state.url} controls autoPlay preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}>Tu navegador no puede reproducir este audio.</audio>
                  </div>}
      </div>
    </section>
  </div>
}
