import SlaDocument from "@/components/legal/documents/sla-document";
import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "SLA | Revolis.AI",
  description: "Service Level Agreement — uptime, kredity a AI záruky.",
};

export default function SlaPage() {
  return (
    <LegalPageShell
      title="Service Level Agreement (SLA)"
      subtitle="Detail annex — dostupnosť, servisné kredity a výkonnostné záruky. Posledná aktualizácia: 15. apríla 2026."
    >
      <SlaDocument />
    </LegalPageShell>
  );
}
