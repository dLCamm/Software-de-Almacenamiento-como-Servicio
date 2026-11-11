import { useState } from 'react'
import Icon from './Icon'
import { MAX_SHARE_SECONDS as MAX_SECONDS } from '../shareDuration'

const UNITS = { minutos: 60, horas: 3600, dias: 86400 }
const PRESETS = [
  { label: '1 hora', seconds: 3600 },
  { label: '1 día', seconds: 86400 },
  { label: '3 días', seconds: 3 * 86400 },
  { label: '7 días', seconds: MAX_SECONDS },
]

function formatExpiry(seconds) {
  const date = new Date(Date.now() + seconds * 1000)
  return new Intl.DateTimeFormat('es-GT', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }).format(date)
}

export default function ShareDurationPicker({ fileName, busy, onCancel, onConfirm }) {
  const [mode, setMode] = useState(86400)
  const [amount, setAmount] = useState('12')
  const [unit, setUnit] = useState('horas')

  const customSeconds = Math.round(Number(amount) * UNITS[unit])
  const isCustom = mode === 'custom'
  const seconds = isCustom ? customSeconds : mode
  const tooLong = isCustom && customSeconds > MAX_SECONDS
  const tooShort = isCustom && (!Number.isFinite(customSeconds) || customSeconds < 60)
  const invalid = tooLong || tooShort

  return <form className="share-setup" onSubmit={(event) => { event.preventDefault(); if (!invalid) onConfirm(seconds) }}>
    <p>Elige cuánto tiempo estará activo el enlace de <strong>{fileName}</strong>. Al vencer, ya no se podrá descargar.</p>
    <div className="share-setup__presets" role="radiogroup" aria-label="Duración del enlace">
      {PRESETS.map((preset) => <button key={preset.seconds} type="button" role="radio" aria-checked={mode === preset.seconds} className={mode === preset.seconds ? 'is-active' : ''} onClick={() => setMode(preset.seconds)}>{preset.label}</button>)}
      <button type="button" role="radio" aria-checked={isCustom} className={isCustom ? 'is-active' : ''} onClick={() => setMode('custom')}>Personalizado</button>
    </div>
    {isCustom && <div className="share-setup__custom">
      <input className="dialog-input" type="number" min="1" step="1" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="Cantidad" autoFocus />
      <select className="dialog-input" value={unit} onChange={(event) => setUnit(event.target.value)} aria-label="Unidad">
        <option value="minutos">minutos</option>
        <option value="horas">horas</option>
        <option value="dias">días</option>
      </select>
    </div>}
    <div className={`share-setup__summary${invalid ? ' is-error' : ''}`} role="status">
      <Icon name="clock" size={17} />
      <span>{tooLong ? 'El máximo permitido es 7 días.' : tooShort ? 'La duración mínima es 1 minuto.' : <>Vence el <strong>{formatExpiry(seconds)}</strong></>}</span>
    </div>
    <div className="dialog-actions">
      <button className="dialog-secondary" type="button" onClick={onCancel}>Cancelar</button>
      <button className="dialog-primary" type="submit" disabled={busy || invalid}>{busy ? 'Generando…' : 'Crear enlace'}</button>
    </div>
  </form>
}
