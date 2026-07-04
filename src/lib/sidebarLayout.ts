const STORAGE_KEY = 'storybuilder-sidebar-collapsed'

export function readSidebarCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) return stored === 'true'
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      return true
    }
    return false
  } catch {
    return false
  }
}

export function writeSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(collapsed))
  } catch {
    // ignore
  }
}
