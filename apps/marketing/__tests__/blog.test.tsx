import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import BlogIndexPage from '../app/blog/page'
import BlogArticlePage, { generateMetadata, generateStaticParams } from '../app/blog/[slug]/page'
import { BlogChrome } from '../components/blog/BlogChrome'
import {
  FIRST_ARTICLE_SLUG,
  formatBlogDate,
  getPublishedArticle,
  getPublishedBlogPaths,
  listPublishedArticles,
} from '../lib/blog'
import { renderMarkdown } from '../lib/markdown'
import sitemap from '../app/sitemap'
import { PUBLIC_SITEMAP_PATHS } from '../lib/site'

const ARTICLE_PATH = `/blog/${FIRST_ARTICLE_SLUG}`

describe('blog articles', () => {
  it('publishes the first market article with required metadata', () => {
    const articles = listPublishedArticles()
    const article = getPublishedArticle(FIRST_ARTICLE_SLUG)

    expect(articles).toHaveLength(1)
    expect(article?.slug).toBe(FIRST_ARTICLE_SLUG)
    expect(article?.title).toBe('Ceny nehnuteľností 2026: spomalenie, sadzby a nové LTV')
    expect(article?.description).toContain('NBS:')
    expect(article?.keyword).toBe('ceny nehnuteľností 2026')
    expect(article?.author).toBe('Andrej Ondruš')
    expect(article?.date).toBe('2026-10-19')
    expect(article?.published).toBe(true)
    expect(article?.title).toMatch(/ľ|ť|č/)
    expect(formatBlogDate('2026-10-19')).toBe('19. októbra 2026')
  })

  it('keeps the approved trial CTA and sources note, without pilot or Revolis pricing', () => {
    const article = getPublishedArticle(FIRST_ARTICLE_SLUG)
    expect(article?.body).toContain('14 dní zadarmo, bez platobnej karty')
    expect(article?.body).toContain('https://app.revolis.ai/register')
    expect(article?.body).toContain('Zdroje: Národná banka Slovenska')
    expect(article?.body).not.toMatch(/pilot/i)
    expect(article?.body).not.toMatch(/cenník/i)
    expect(article?.body).not.toMatch(/\b(25|60|79|149)\s*€/)
  })

  it('returns undefined for an unknown slug', () => {
    expect(getPublishedArticle('neexistuje')).toBeUndefined()
  })
})

describe('renderMarkdown', () => {
  it('renders headings, lists, bold, links and the sources note', () => {
    const article = getPublishedArticle(FIRST_ARTICLE_SLUG)
    const html = renderToStaticMarkup(<>{renderMarkdown(article!.body)}</>)

    expect(html).toContain('<h1>')
    expect(html).toContain('Ceny nehnuteľností 2026: rast spomalil')
    expect(html).toContain('<h2>')
    expect(html).toContain('Ceny bývania: stále hore, ale pomalšie')
    expect(html).toContain('<h3>')
    expect(html).toContain('Byty verzus domy')
    expect(html).toContain('<ul>')
    expect(html).toContain('<strong>3 041 €/m²</strong>')
    expect(html).toContain('href="https://app.revolis.ai/register"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('Vytvoriť účet na app.revolis.ai')
    expect(html).toContain('class="blog-sources"')
    expect(html).toContain('Zdroje: Národná banka Slovenska')
    expect(html).not.toMatch(/pilot/i)
  })
})

describe('blog pages', () => {
  it('lists the published article on /blog', () => {
    const html = renderToStaticMarkup(<BlogIndexPage />)
    expect(html).toContain('Prehľad pre maklérov')
    expect(html).toContain('Ceny nehnuteľností 2026: spomalenie, sadzby a nové LTV')
    expect(html).toContain(`href="${ARTICLE_PATH}"`)
    expect(html).toContain('19. októbra 2026')
    expect(html).not.toMatch(/pilot/i)
  })

  it('renders the article page with chrome, metadata helpers and register CTA', async () => {
    const el = await BlogArticlePage({ params: Promise.resolve({ slug: FIRST_ARTICLE_SLUG }) })
    const html = renderToStaticMarkup(
      <BlogChrome>
        {el}
      </BlogChrome>,
    )

    expect(html).toContain('Andrej Ondruš')
    expect(html).toContain('19. októbra 2026')
    expect(html).toContain('href="https://app.revolis.ai/register"')
    expect(html).toContain('14 dní zadarmo, bez platobnej karty')
    expect(html).toContain('Všetky články')
    expect(html).toContain('REVOLIS')
    expect(html).not.toMatch(/pilot/i)
    expect(html).not.toMatch(/cenník/i)

    expect(await generateStaticParams()).toEqual([{ slug: FIRST_ARTICLE_SLUG }])
    const meta = await generateMetadata({ params: Promise.resolve({ slug: FIRST_ARTICLE_SLUG }) })
    expect(meta.alternates).toEqual({ canonical: ARTICLE_PATH })
    expect(meta.description).toContain('NBS:')
  })
})

describe('blog sitemap contract', () => {
  it('exposes /blog and the first article slug', () => {
    expect(getPublishedBlogPaths()).toEqual(['/blog', ARTICLE_PATH])
    expect(PUBLIC_SITEMAP_PATHS).toContain('/blog')
    expect(PUBLIC_SITEMAP_PATHS).toContain(ARTICLE_PATH)
    const urls = sitemap().map((entry) => entry.url)
    expect(urls).toContain('https://www.revolis.ai/blog')
    expect(urls).toContain(`https://www.revolis.ai${ARTICLE_PATH}`)
  })
})
