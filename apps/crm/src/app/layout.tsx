import "./globals.css";
import CookieConsentBanner from "@/components/legal/cookie-consent-banner";
import Script from "next/script";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className="overflow-x-hidden">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-R1GZQFV42V"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-R1GZQFV42V');
          `}
        </Script>
      </head>
      <body suppressHydrationWarning className="overflow-x-hidden">
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
