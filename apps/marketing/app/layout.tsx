import type { Metadata } from 'next'
import Script from 'next/script'
import { MARKETING_SITE_ORIGIN } from '../lib/site'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(MARKETING_SITE_ORIGIN),
  title: 'Revolis — Inzerát hotový za minúty. Dopyty v CRM samé.',
  description:
    'Dopyty z portálových e-mailov sa uložia samé. AI pripraví text inzerátu z parametrov nehnuteľnosti. 14 dní zadarmo bez karty.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    url: '/',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sk">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-R1GZQFV42V" strategy="beforeInteractive" />
        <Script id="gtag-init" strategy="beforeInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-R1GZQFV42V', { page_title: document.title, send_page_view: true });
          (function(){
            var p = new URLSearchParams(window.location.search);
            var u = { source: p.get('utm_source'), medium: p.get('utm_medium'), campaign: p.get('utm_campaign') };
            if (u.source) { sessionStorage.setItem('utm_data', JSON.stringify(u)); if(typeof gtag!=='undefined') gtag('set','user_properties',{utm_source:u.source,utm_campaign:u.campaign}); }
          })();
        `}</Script>
      </head>
      <body>{children}</body>
    </html>
  )
}
