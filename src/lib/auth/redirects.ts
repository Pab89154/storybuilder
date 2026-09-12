/** Build an absolute app URL that respects Vite/GitHub Pages base path.
 * Prefer VITE_APP_URL (production) so auth emails never fall back to a wrong host.
 */
export function buildAppUrl(path = ''): string {
  const configured = (import.meta.env.VITE_APP_URL as string | undefined)?.trim()
  const origin = configured
    ? configured.replace(/\/$/, '')
    : typeof window !== 'undefined'
      ? window.location.origin
      : 'https://storybuilder.pw'
  const base = import.meta.env.BASE_URL || '/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const normalizedPath = path.replace(/^\//, '')
  return new URL(normalizedPath, `${origin}${normalizedBase}`).toString()
}
