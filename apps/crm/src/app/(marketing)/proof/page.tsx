import { Metadata } from "next";
import ProofFunnelClient from "@/components/proof/ProofFunnelClient";
import LegalFooter from "@/components/marketing/LegalFooter";
import { SLATE_HORIZON } from "@/lib/slate-horizon-theme";

export const metadata: Metadata = {
  title: "Proof of Value — Odhad úniku provízií | Revolis.AI",
  description:
    "5 minútový odhad Revenue Health Indexu pre realitné kancelárie — z vašich odpovedí a trhových benchmarkov.",
};

export default function ProofPage() {
  return (
    <main
      className="min-h-screen"
      style={{ background: SLATE_HORIZON.bg, color: SLATE_HORIZON.ink }}
    >
      <ProofFunnelClient />
      <LegalFooter />
    </main>
  );
}
