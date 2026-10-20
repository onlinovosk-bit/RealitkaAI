/**
 * Canonical public origin for the marketing site.
 * Apex revolis.ai is not the indexable host — that redirect lives in Vercel
 * Domains (307 today), not in this repo.
 */
export const MARKETING_SITE_ORIGIN = 'https://www.revolis.ai'

export const ROBOTS_DISALLOW = ['/api/', '/app/', '/private/', '/zakulisie/'] as const

/**
 * Indexable App Router pages that return 200 on www today.
 * Excludes /zakulisie/* (noindex), /landing (308 → zákulisie),
 * and static HTML duplicates (/demo.html, /revolis-demo-v3.html).
 */
export const PUBLIC_SITEMAP_PATHS = ['/', '/demo', '/balik'] as const

export function marketingUrl(path: string = '/'): string {
  if (path === '/' || path === '') return `${MARKETING_SITE_ORIGIN}/`
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${MARKETING_SITE_ORIGIN}${normalized}`
}
