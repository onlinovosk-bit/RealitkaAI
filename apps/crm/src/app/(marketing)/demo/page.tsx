import { Metadata } from "next";
import UnifiedDemo from "@/components/marketing/UnifiedDemo";

export const metadata: Metadata = {
  title: "Demo – AI Odhadca, Radar príležitostí, ROI Kalkulačka | Revolis.AI",
  description:
    "Živá ukážka AI modulov: odhadca ceny, radar príležitostí, ROI kalkulačka.",
};

export default function DemoPage() {
  return <UnifiedDemo />;
}
