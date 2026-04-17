import ReadinessChecklistDocument from "@/components/legal/documents/readiness-checklist-document";
import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "Enterprise Readiness Checklist | Revolis.AI",
  description: "MSA checklist — právne dokumenty, GDPR, AI compliance a contractual moat.",
};

export default function ReadinessChecklistPage() {
  return (
    <LegalPageShell
      title="MSA Checklist — Enterprise Readiness"
      subtitle="Kontrola kompletnosti pred podpisom enterprise zmluvy. Posledná aktualizácia: 15. apríla 2026."
    >
      <ReadinessChecklistDocument />
    </LegalPageShell>
  );
}
