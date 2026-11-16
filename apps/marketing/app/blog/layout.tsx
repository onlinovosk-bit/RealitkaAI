import type { Metadata } from 'next'
import { BlogChrome } from '../../components/blog/BlogChrome'
import './blog.css'

export const metadata: Metadata = {
  title: 'Blog — Revolis',
  description:
    'Blog pre maklérov: slovenský trh nehnuteľností, hypotéky a sadzby, legislatíva a praktické tipy k dopytom a inzerátu.',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'Blog — Revolis',
    description:
      'Blog pre maklérov: slovenský trh nehnuteľností, hypotéky a sadzby, legislatíva a praktické tipy k dopytom a inzerátu.',
    type: 'website',
    locale: 'sk_SK',
    siteName: 'Revolis',
    url: '/blog',
  },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <BlogChrome>{children}</BlogChrome>
}
