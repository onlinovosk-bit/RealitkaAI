import type { Metadata } from "next";
import { SmolkoDemoPage } from "@/components/marketing/SmolkoDemo";

export const metadata: Metadata = {
  title: "Reality Smolko × Revolis",
  description: "Personalizovaná ukážka Revolis Protocol pre p. Rastislava Smolka.",
  robots: { index: false, follow: false },
};

export default function SmolkoPage() {
  return <SmolkoDemoPage />;
}
