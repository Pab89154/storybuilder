const STORAGE_KEY = 'storybuilder-blind-kid-mode'

export function readBlindKidMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function writeBlindKidMode(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled))
  } catch {
    /* ignore */
  }
}

export function applyBlindKidModeClass(enabled: boolean): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('blind-kid-mode', enabled)
}
