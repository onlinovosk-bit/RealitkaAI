import type { Metadata } from "next";
import AcquisitionHub from "@/components/marketing/AcquisitionHub";

export const metadata: Metadata = {
  title: "AI Odhadca – Bezplatný odhad ceny nehnuteľnosti | Revolis.AI",
  description:
    "Zistite trhovú cenu vašej nehnuteľnosti za 30 sekúnd. AI Odhadca, Neighborhood Watch, Digital Twin Ads a ďalšie moduly zdarma.",
  robots: { index: true, follow: true },
};

export default function DemoOdhadPage() {
  return <AcquisitionHub />;
}
