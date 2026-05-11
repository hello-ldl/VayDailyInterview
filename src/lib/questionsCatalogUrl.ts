/** URLs for files served from `public/questions/` (respects Vite `base`, e.g. GitHub Pages). */
export function questionsCatalogUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL
  const root = base.endsWith('/') ? base : `${base}/`
  const p = relativePath.replace(/^\//, '')
  return `${root}questions/${p}`
}
