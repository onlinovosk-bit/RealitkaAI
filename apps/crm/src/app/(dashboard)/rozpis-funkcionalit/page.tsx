import type { Metadata } from "next";
import RozpisFunkcionalit from "@/components/billing/RozpisFunkcionalit";
import { isPricingV2Enabled } from "@/lib/pricing-v2";

export const metadata: Metadata = {
  title: "Rozpis funkcionalít – Revolis.AI",
};

export default function RozpisFunkcionalitPage() {
  // Cenník v2: pri zapnutom prepínači sa zastarané ceny 49/99/199/449 € neukazujú (prepínač sa číta na serveri).
  return isPricingV2Enabled() ? <RozpisFunkcionalit hidePrices /> : <RozpisFunkcionalit />;
}
