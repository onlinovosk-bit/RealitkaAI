import type { MetadataRoute } from 'next'
import { MARKETING_SITE_ORIGIN, ROBOTS_DISALLOW } from '../lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [...ROBOTS_DISALLOW],
    },
    sitemap: marketingSitemapUrl(),
    host: MARKETING_SITE_ORIGIN,
  }
}

export function marketingSitemapUrl(): string {
  return `${MARKETING_SITE_ORIGIN}/sitemap.xml`
}
