import PrivacyPolicyDocument from "@/components/legal/documents/privacy-policy-document";
import LegalPackNav from "@/components/legal/legal-pack-nav";
import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "Privacy Policy | Revolis.AI",
  description:
    "Zásady ochrany osobných údajov — kategórie údajov, retention, práva a cookies. Súvisiace dokumenty: DPA, MSA, SLA.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      subtitle="Zásady ochrany osobných údajov pre Revolis.AI. Ďalšie zmluvné a enterprise dokumenty sú na samostatných stránkach nižšie. Posledná aktualizácia: 15. apríla 2026."
    >
      <div className="space-y-10">
        <LegalPackNav />

        <PrivacyPolicyDocument />

        <section className="rounded-lg border border-slate-700 bg-slate-950/60 p-4 text-xs text-slate-300">
          Kompletné právne znenia na podpis alebo due diligence sú dostupné na vyžiadanie v Trust Center balíku alebo v zmluvnej
          dokumentácii. Formulár na DPA:{" "}
          <a href="/dpa-request" className="text-cyan-400 underline hover:text-cyan-300">
            /dpa-request
          </a>
          .
        </section>
      </div>
    </LegalPageShell>
  );
}
