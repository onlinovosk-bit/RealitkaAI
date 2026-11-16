import { BLOG_INDEX_PATH, blogArticlePath, type BlogArticle } from './blog'
import { MARKETING_SITE_ORIGIN, marketingUrl } from './site'

/** Public logo file in the CRM app (`apps/crm/public/icons/revolis-512.png`). */
export const ORGANIZATION_LOGO_URL = 'https://app.revolis.ai/icons/revolis-512.png'

export const ORGANIZATION_NAME = 'Revolis.ai'

export const ORGANIZATION_ID = `${MARKETING_SITE_ORIGIN}/#organization`
export const WEBSITE_ID = `${MARKETING_SITE_ORIGIN}/#website`

export const HOMEPAGE_DESCRIPTION =
  'AI CRM pre realitných maklérov na Slovensku: inzerát hotový za minúty, dopyty v CRM a denné priority. Vyskúšajte 14 dní zadarmo bez karty.'

export function organizationJsonLd() {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: ORGANIZATION_NAME,
    url: marketingUrl('/'),
    logo: ORGANIZATION_LOGO_URL,
  }
}

export function websiteJsonLd() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: ORGANIZATION_NAME,
    url: marketingUrl('/'),
    inLanguage: 'sk',
    publisher: { '@id': ORGANIZATION_ID },
  }
}

export function homepageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [organizationJsonLd(), websiteJsonLd()],
  }
}

export function blogCollectionJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Prehľad pre maklérov',
    url: marketingUrl(BLOG_INDEX_PATH),
    inLanguage: 'sk',
    isPartOf: { '@id': WEBSITE_ID },
    publisher: {
      '@type': 'Organization',
      name: ORGANIZATION_NAME,
      url: marketingUrl('/'),
    },
  }
}

export function articleBreadcrumbJsonLd(article: BlogArticle) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Domov',
        item: marketingUrl('/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: marketingUrl(BLOG_INDEX_PATH),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: article.title,
        item: marketingUrl(blogArticlePath(article.slug)),
      },
    ],
  }
}

export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data)
}

function collectJsonValues(value: unknown, acc: unknown[]): void {
  acc.push(value)
  if (Array.isArray(value)) {
    for (const item of value) collectJsonValues(item, acc)
    return
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      acc.push(key)
      collectJsonValues(nested, acc)
    }
  }
}

export function jsonLdContainsForbiddenCommercialSchema(data: unknown): boolean {
  const values: unknown[] = []
  collectJsonValues(data, values)
  return values.some((item) => {
    if (typeof item !== 'string') return false
    const lower = item.toLowerCase()
    return lower === 'offer' || lower === 'offers' || lower === 'aggregaterating'
  })
}
