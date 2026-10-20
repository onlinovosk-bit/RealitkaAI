import { describe, expect, it } from 'vitest'
import robots, { marketingSitemapUrl } from '../app/robots'
import sitemap from '../app/sitemap'
import {
  MARKETING_SITE_ORIGIN,
  PUBLIC_SITEMAP_PATHS,
  ROBOTS_DISALLOW,
  marketingUrl,
} from '../lib/site'

describe('marketing site origin', () => {
  it('is the www host, never the apex', () => {
    expect(MARKETING_SITE_ORIGIN).toBe('https://www.revolis.ai')
    expect(marketingUrl('/')).toBe('https://www.revolis.ai/')
    expect(marketingUrl('/demo')).toBe('https://www.revolis.ai/demo')
    expect(marketingUrl('balik')).toBe('https://www.revolis.ai/balik')
  })
})

describe('robots()', () => {
  it('allows marketing pages, disallows app/api/private routes, and points at the www sitemap', () => {
    const doc = robots()
    const rules = Array.isArray(doc.rules) ? doc.rules[0] : doc.rules

    expect(rules.userAgent).toBe('*')
    expect(rules.allow).toBe('/')
    expect(rules.disallow).toEqual(['/api/', '/app/', '/private/', '/zakulisie/'])
    expect(ROBOTS_DISALLOW).toEqual(rules.disallow)
    expect(doc.sitemap).toBe('https://www.revolis.ai/sitemap.xml')
    expect(doc.sitemap).toBe(marketingSitemapUrl())
    expect(doc.host).toBe(MARKETING_SITE_ORIGIN)
  })
})

describe('sitemap()', () => {
  it('lists only existing public www marketing URLs', () => {
    const entries = sitemap()
    const urls = entries.map((entry) => entry.url)

    expect(PUBLIC_SITEMAP_PATHS).toEqual(['/', '/demo', '/balik'])
    expect(urls).toEqual([
      'https://www.revolis.ai/',
      'https://www.revolis.ai/demo',
      'https://www.revolis.ai/balik',
    ])
    expect(urls.every((url) => url.startsWith('https://www.revolis.ai'))).toBe(true)
    expect(urls.some((url) => url.includes('revolis.ai/') && !url.includes('www.'))).toBe(false)
    expect(urls.some((url) => url.includes('/zakulisie') || url.includes('/api/') || url.includes('app.revolis.ai'))).toBe(
      false,
    )
  })
})
