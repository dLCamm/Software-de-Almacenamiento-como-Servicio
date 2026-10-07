import { useEffect, useState } from 'react'
import { getFileExtension, getFileKind } from '../client/dashboard/fileTypes'
import Icon from '../client/dashboard/components/Icon'
import './SharedFilePage.css'

function formatCountdown(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const dayLabel = `${days} ${days === 1 ? 'día' : 'días'}`
  return `${dayLabel} · ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function isDownloadUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export default function SharedFilePage() {
  const params = new URLSearchParams(window.location.search)
  const fileName = params.get('name')?.trim() || ''
  const downloadUrl = params.get('download') || ''
  const expiresAt = Number(params.get('expires_at'))
  const linkIsValid = Boolean(fileName && isDownloadUrl(downloadUrl) && Number.isFinite(expiresAt) && expiresAt > 0)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!linkIsValid) return undefined
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [linkIsValid])

  const secondsRemaining = linkIsValid ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : 0
  const expired = linkIsValid && secondsRemaining === 0
  const fileKind = getFileKind(getFileExtension(fileName))

  return <main className="shared-file-page">
    <header className="shared-file__topbar">
      <span className="shared-file__brand">Kubo</span>
      <span className="shared-file__filename" title={fileName || undefined}>{fileName || 'Archivo compartido'}</span>
    </header>

    <section className="shared-file__content" aria-label="Archivo compartido">
      <div className="shared-file__card">
        <span className="shared-file__glyph"><Icon name={fileKind} size={46} /></span>
        {expired
          ? <p className="shared-file__expired" role="status">El enlace ha expirado</p>
          : linkIsValid
            ? <>
              <div className="shared-file__countdown" role="timer" aria-label={`El enlace expira en ${formatCountdown(secondsRemaining)}`}>
                <span>El enlace expira en</span>
                <strong>{formatCountdown(secondsRemaining)}</strong>
              </div>
              <a className="shared-file__download" href={downloadUrl} download={fileName} referrerPolicy="no-referrer">
                <Icon name="download" size={19} />Descargar archivo
              </a>
            </>
            : <p className="shared-file__expired" role="status">Este enlace no está disponible</p>}
      </div>
    </section>
  </main>
}
