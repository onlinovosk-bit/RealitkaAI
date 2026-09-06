import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import CookieConsentBanner from "@/components/legal/cookie-consent-banner";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GoogleAnalytics />
      <CookieConsentBanner />
      {children}
    </>
  );
}