import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GoogleAnalytics />
      {children}
    </>
  );
}
