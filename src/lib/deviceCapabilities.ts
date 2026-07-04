/** True on phones/tablets where auto-loading a multi‑MB LLM causes Safari tab reloads. */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) return true
  // iPadOS 13+ reports as Mac with touch
  return navigator.maxTouchPoints > 1 && /MacIntel|Macintosh/i.test(navigator.platform)
}
