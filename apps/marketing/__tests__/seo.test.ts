import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'
import robots, { marketingSitemapUrl } from '../app/robots'
import sitemap from '../app/sitemap'
import { CRM_ARTICLE_SLUG } from '../lib/blog'
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

    expect(PUBLIC_SITEMAP_PATHS).toEqual([
      '/',
      '/demo',
      '/balik',
      '/blog',
      '/blog/ceny-nehnutelnosti-2026-sadzby-nove-ltv',
    ])
    expect(urls).toEqual([
      'https://www.revolis.ai/',
      'https://www.revolis.ai/demo',
      'https://www.revolis.ai/balik',
      'https://www.revolis.ai/blog',
      'https://www.revolis.ai/blog/ceny-nehnutelnosti-2026-sadzby-nove-ltv',
    ])
    expect(urls.every((url) => url.startsWith('https://www.revolis.ai'))).toBe(true)
    expect(urls.some((url) => url.includes('revolis.ai/') && !url.includes('www.'))).toBe(false)
    expect(urls.some((url) => url.includes('/zakulisie') || url.includes('/api/') || url.includes('app.revolis.ai'))).toBe(
      false,
    )
    expect(PUBLIC_SITEMAP_PATHS).not.toContain(`/blog/${CRM_ARTICLE_SLUG}`)
  })
})

describe('homepage metadata', () => {
  it('keeps the App Router layout title and description in Slovak without the expired deadline', () => {
    const layout = readFileSync(resolve(__dirname, '../app/layout.tsx'), 'utf-8')
    expect(layout).toContain(
      "title: 'Revolis.ai – AI CRM pre realitných maklérov | Inzerát hotový za minúty'",
    )
    expect(layout).toContain(
      'AI CRM pre realitných maklérov na Slovensku. Dopyty z portálových e-mailov sa uložia samé, text inzerátu pripraví AI. 14 dní zadarmo, bez karty. Ak nebudete spokojní, do 30 dní vrátime 100 % peňazí.',
    )
    expect(layout).not.toMatch(/23\. ?10/)
  })
})
