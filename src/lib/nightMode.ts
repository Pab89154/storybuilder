const STORAGE_KEY = 'storybuilder-night-mode'

export function readNightMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function writeNightMode(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled))
  } catch {
    /* ignore */
  }
}

export function applyNightModeClass(enabled: boolean): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('night-mode', enabled)
  document.documentElement.style.colorScheme = enabled ? 'dark' : 'light'
}
