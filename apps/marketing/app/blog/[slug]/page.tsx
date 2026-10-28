import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  BLOG_INDEX_PATH,
  blogArticlePath,
  formatBlogDate,
  getPublishedArticle,
  listPublishedArticles,
} from '../../../lib/blog'
import { renderMarkdown } from '../../../lib/markdown'
import { marketingUrl } from '../../../lib/site'

type PageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return listPublishedArticles().map((article) => ({ slug: article.slug }))
}

export const dynamicParams = false

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const article = getPublishedArticle(slug)
  if (!article) return {}

  const path = blogArticlePath(article.slug)
  return {
    title: `${article.title} — Revolis`,
    description: article.description,
    keywords: [article.keyword],
    authors: [{ name: article.author }],
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: article.title,
      description: article.description,
      type: 'article',
      locale: 'sk_SK',
      siteName: 'Revolis',
      url: path,
      publishedTime: article.date,
    },
  }
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params
  const article = getPublishedArticle(slug)
  if (!article) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    author: {
      '@type': 'Person',
      name: article.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Revolis',
      url: marketingUrl('/'),
    },
    mainEntityOfPage: marketingUrl(blogArticlePath(article.slug)),
    keywords: article.keyword,
    inLanguage: 'sk',
  }

  return (
    <main className="blog-wrap blog-main">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href={BLOG_INDEX_PATH} className="blog-back">
        ← Všetky články
      </Link>
      <p className="blog-tag">{article.keyword}</p>
      <div className="blog-article-meta">
        <span>{article.author}</span>
        <time dateTime={article.date}>{formatBlogDate(article.date)}</time>
      </div>
      {renderMarkdown(article.body)}
    </main>
  )
}
