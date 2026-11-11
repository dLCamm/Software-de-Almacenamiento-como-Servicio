// Cubo isométrico — logo de Kubo. Tres caras (arriba, izquierda, derecha)
// para que se lea como un cubo 3D incluso a tamaño pequeño (favicon, navbar).
export function CubeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 2.5 20.5 7.25V16.75L12 21.5 3.5 16.75V7.25L12 2.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 2.5V12M12 12 20.5 7.25M12 12 3.5 7.25M12 12V21.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Versión rellena (dos caras con distinto tono) para el logo de marca,
// donde queremos que se note el volumen del cubo a simple vista.
export function CubeLogoIcon(props) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M12 2.3 21 7.4v9.2L12 21.7 3 16.6V7.4L12 2.3Z" fill="currentColor" opacity="0.28" />
      <path d="M12 2.3 21 7.4 12 12.5 3 7.4 12 2.3Z" fill="currentColor" opacity="0.85" />
      <path d="M12 12.5 21 7.4v9.2L12 21.7V12.5Z" fill="currentColor" opacity="0.55" />
      <path d="M12 12.5 3 7.4v9.2l9 4.9V12.5Z" fill="currentColor" />
    </svg>
  )
}

export function MailIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function LockIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="4.5" y="10.5" width="15" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function UserIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function EyeIcon({ open, ...props }) {
  if (!open) {
    return (
      <svg viewBox="0 0 24 24" fill="none" {...props}>
        <path
          d="M3 3l18 18M10.6 10.7a2.3 2.3 0 0 0 3.2 3.2M6.3 6.5C4 8 2.5 10 2 12c1.6 3.8 5.4 7 10 7 1.7 0 3.2-.4 4.6-1.1M9.9 5.2A10.8 10.8 0 0 1 12 5c4.6 0 8.4 3.2 10 7-.5 1.2-1.2 2.4-2.1 3.4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M2 12c1.6-3.8 5.4-7 10-7s8.4 3.2 10 7c-1.6 3.8-5.4 7-10 7s-8.4-3.2-10-7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export function CheckDotIcon(props) {
  return (
    <svg viewBox="0 0 8 8" fill="currentColor" {...props}>
      <circle cx="4" cy="4" r="4" />
    </svg>
  )
}

export function ShieldLockIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 3 5 5.8v5.3c0 4.6 3 7.9 7 9.1 4-1.2 7-4.5 7-9.1V5.8L12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <rect x="9.5" y="11.5" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.3 11.5V10a1.7 1.7 0 0 1 3.4 0v1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function ShareIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 15V4M12 4 8.5 7.5M12 4l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function FolderIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M4 6.5a1.5 1.5 0 0 1 1.5-1.5h4l1.8 2H18.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-11Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function AdminShieldIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 3 5 5.8v5.3c0 4.6 3 7.9 7 9.1 4-1.2 7-4.5 7-9.1V5.8L12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="m9.3 12 1.9 1.9 3.6-3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function UsersIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15.5 6.2a3 3 0 0 1 0 5.8M17.5 19a5 5 0 0 0-3.3-4.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function GaugeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M4 15.5a8 8 0 1 1 16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 15.5 15.5 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function StarIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="m12 3 2.6 5.7 6.2.7-4.6 4.3 1.3 6.1L12 16.9 6.5 19.8l1.3-6.1-4.6-4.3 6.2-.7L12 3Z" />
    </svg>
  )
}

export function ArrowRightIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M4 12h16M14 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ShieldIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 3 5 5.8v5.3c0 4.6 3 7.9 7 9.1 4-1.2 7-4.5 7-9.1V5.8L12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CloudIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M7 18a4.5 4.5 0 0 1-.4-8.98A5.5 5.5 0 0 1 17.2 8.1 4 4 0 0 1 17 18H7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CheckIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
