import Link from 'next/link'
import { blogArticlePath, formatBlogDate, listPublishedArticles } from '../../lib/blog'

export default function BlogIndexPage() {
  const articles = listPublishedArticles()

  return (
    <main className="blog-wrap blog-main">
      <p className="blog-tag">Blog</p>
      <h1 className="blog-index-title">Prehľad pre maklérov</h1>
      <p className="blog-lead">
        Čo sa mení na trhu a ako to ovplyvní nábery, hypotéky a rozhodovanie kupujúcich.
      </p>
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
