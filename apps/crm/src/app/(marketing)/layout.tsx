import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import CookieConsentBanner from "@/components/legal/cookie-consent-banner";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GoogleAnalytics />
      <CookieConsentBanner />
      {children}
    </>
  );
}
