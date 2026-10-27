import type { ReactNode } from 'react'
import Link from 'next/link'

const REGISTER_URL = 'https://app.revolis.ai/register'

export function BlogChrome({ children }: { children: ReactNode }) {
  return (
    <div className="blog-page">
      <header className="blog-nav">
        <Link href="/" className="blog-logo">
          REVOLIS<span>.AI</span>
        </Link>
        <nav className="blog-nav-links" aria-label="Hlavná navigácia">
          <Link href="/blog">Blog</Link>
          <a href={REGISTER_URL}>Vyskúšať 14 dní zadarmo</a>
        </nav>
      </header>
      {children}
      <footer className="blog-footer">
        <div className="blog-wrap blog-footer-inner">
          <span>© 2026 Revolis — ONLINOVO s.r.o.</span>
          <span>
            <Link href="/blog">Blog</Link>
            {' · '}
            <a href="https://app.revolis.ai/privacy-policy">Ochrana osobných údajov</a>
            {' · '}
            <a href="https://app.revolis.ai/terms">VOP</a>
            {' · '}
            <a href="mailto:info@revolis.ai">info@revolis.ai</a>
          </span>
        </div>
      </footer>
    </div>
  )
}
