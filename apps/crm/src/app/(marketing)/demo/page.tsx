import { Metadata } from "next";
import UnifiedDemo from "@/components/marketing/UnifiedDemo";

export const metadata: Metadata = {
  title: "Demo – AI Odhadca, L99 Radar príležitostí, ROI Kalkulačka | Revolis.AI",
  description:
    "Živá ukážka AI modulov: odhadca ceny, L99 Radar príležitostí, ROI kalkulačka.",
};

export default function DemoPage() {
  return <UnifiedDemo />;
}
