/** Build an absolute app URL that respects Vite/GitHub Pages base path. */
export function buildAppUrl(path = ''): string {
  const origin = window.location.origin
  const base = import.meta.env.BASE_URL || '/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const normalizedPath = path.replace(/^\//, '')
  return new URL(normalizedPath, `${origin}${normalizedBase}`).toString()
}
