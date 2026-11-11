import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'kubo-theme'

function readTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

// Avisa a todos los botones de tema cuando cambia el atributo data-theme del <html>.
function subscribe(callback) {
  const observer = new MutationObserver(callback)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}

export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Sin acceso a localStorage (modo privado): el tema solo dura esta visita.
  }
}

/** Tema actual ("dark" | "light") y función para alternarlo. El tema inicial lo pone index.html. */
export default function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'dark')
  const toggleTheme = useCallback(() => setTheme(readTheme() === 'light' ? 'dark' : 'light'), [])
  return { theme, toggleTheme }
}
