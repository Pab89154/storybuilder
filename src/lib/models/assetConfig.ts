/** Base URL without trailing slash, or null to use upstream CDNs. */
export function getModelsBaseUrl(): string | null {
  const raw = import.meta.env.VITE_MODELS_BASE_URL as string | undefined
  if (raw === '0' || raw === 'false') return null
  if (typeof raw === 'string' && raw.length > 0) {
    return raw.replace(/\/$/, '')
  }
  return null
}

/** Same-origin absolute base for fetch (browser + web-llm). */
export function getModelsOrigin(): string | null {
  const base = getModelsBaseUrl()
  if (!base) return null
  if (base.startsWith('http://') || base.startsWith('https://')) {
    return base.replace(/\/$/, '')
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    const path = base.startsWith('/') ? base : `/${base}`
    return `${window.location.origin}${path}`.replace(/\/$/, '')
  }
  return base.replace(/\/$/, '')
}
