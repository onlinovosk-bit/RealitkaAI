import type { Metadata } from "next";
import { SmolkoDemoPage } from "@/components/marketing/SmolkoDemo";

export const metadata: Metadata = {
  title: "Reality Smolko × Revolis L99",
  description: "Personalizovaná ukážka Revolis L99 Protocol pre p. Rastislava Smolka.",
  robots: { index: false, follow: false },
};

export default function SmolkoPage() {
  return <SmolkoDemoPage />;
}
