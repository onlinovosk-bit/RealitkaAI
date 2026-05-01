import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'Revolis.AI — AI-First CRM pre realitné kancelárie',
  description: 'Revolis.AI odpovedá na každý dopyt za 90 sekúnd, sleduje klientov 18 mesiacov a ukáže ti presne koho kontaktovať dnes.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sk">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-REVOLIS2026" strategy="beforeInteractive" />
        <Script id="gtag-init" strategy="beforeInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-REVOLIS2026', { page_title: document.title, send_page_view: true });
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
