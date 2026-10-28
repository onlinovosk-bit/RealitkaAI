import type { Metadata } from 'next'
import { BlogChrome } from '../../components/blog/BlogChrome'
import './blog.css'

export const metadata: Metadata = {
  title: 'Blog — Revolis',
  description:
    'Čo sa mení na slovenskom realitnom trhu a ako to ovplyvní nábery, hypotéky a rozhodovanie kupujúcich.',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'Blog — Revolis',
    description:
      'Čo sa mení na slovenskom realitnom trhu a ako to ovplyvní nábery, hypotéky a rozhodovanie kupujúcich.',
    type: 'website',
    locale: 'sk_SK',
    siteName: 'Revolis',
    url: '/blog',
  },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <BlogChrome>{children}</BlogChrome>
}
