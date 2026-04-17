import MsaDocument from "@/components/legal/documents/msa-document";
import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "MSA | Revolis.AI",
  description: "Master Service Agreement — Revolis.AI Platform (enterprise).",
};

export default function MsaPage() {
  return (
    <LegalPageShell
      title="Master Service Agreement (MSA)"
      subtitle="Zmluva o poskytovaní služieb — Revolis.AI Platform. Posledná aktualizácia: 15. apríla 2026."
    >
      <MsaDocument />
    </LegalPageShell>
  );
}
