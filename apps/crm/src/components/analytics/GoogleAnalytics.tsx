"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
const STORAGE_KEY = "revolis_cookie_consent_v1";

type ConsentMode = "all" | "necessary";

function readConsentMode(): ConsentMode | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { mode?: unknown };
    if (parsed.mode === "all" || parsed.mode === "necessary") {
      return parsed.mode;
    }
    return null;
  } catch {
    return null;
  }
}

export function GoogleAnalytics() {
  // SSR + first client paint: null until useEffect reads consent (no hydration mismatch).
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(readConsentMode() === "all");

    const onConsent = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: ConsentMode }>).detail;
      setAllowed(detail?.mode === "all");
    };

    window.addEventListener("revolis-cookie-consent", onConsent);
    return () => window.removeEventListener("revolis-cookie-consent", onConsent);
  }, []);

  if (!GA_ID) return null;
  if (!allowed) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { send_page_view: true });
        `}
      </Script>
    </>
  );
}
