import type { Metadata, Viewport } from "next";
import { SlackLayout } from "@/components/navigation/SlackLayout";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { PwaInstallBanner } from "@/components/pwa/PwaInstallBanner";
import { MobileFab } from "@/components/pwa/MobileFab";
import "./globals.css";

export const metadata: Metadata = {
  title: "Revolis.AI",
  description: "AI-first Real Estate Platform — denný plán, leady, analýzy",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Revolis.AI",
  },
  icons: {
    icon: [
      { url: "/icons/revolis-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/revolis-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/revolis-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/icons/revolis-192.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "msapplication-TileColor": "#050914",
    "msapplication-TileImage": "/icons/revolis-144.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#050914",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sk">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/revolis-192.png" />
        <meta name="application-name" content="Revolis.AI" />
      </head>
      <body className="antialiased">
        <SlackLayout>{children}</SlackLayout>
        <MobileBottomNav />
        <MobileFab />
        <PwaInstallBanner />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}

function ServiceWorkerRegistration() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .catch(function(e) { console.warn('SW registration failed:', e); });
  });
}
        `.trim(),
      }}
    />
  );
}
