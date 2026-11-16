import Link from 'next/link'
import { BLOG_INDEX_INTRO, blogArticlePath, formatBlogDate, listPublishedArticles } from '../../lib/blog'
import { blogCollectionJsonLd, jsonLdScript } from '../../lib/json-ld'

export default function BlogIndexPage() {
  const articles = listPublishedArticles()

  return (
    <main className="blog-wrap blog-main">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(blogCollectionJsonLd()) }} />
      <p className="blog-tag">Blog</p>
      <h1 className="blog-index-title">Prehľad pre maklérov</h1>
      <p className="blog-lead">{BLOG_INDEX_INTRO}</p>
      <ul className="blog-card-list">
        {articles.map((article) => (
          <li key={article.slug}>
            <Link href={blogArticlePath(article.slug)} className="blog-card">
              <div className="blog-card-meta">
                <time dateTime={article.date}>{formatBlogDate(article.date)}</time>
                <span className="blog-card-keyword">{article.keyword}</span>
              </div>
              <h2>{article.title}</h2>
              <p>{article.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
