import EnterpriseFaqDocument from "@/components/legal/documents/enterprise-faq-document";
import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "Enterprise FAQ | Revolis.AI",
  description: "AI compliance a due diligence FAQ pre enterprise klientov.",
};

export default function EnterpriseFaqPage() {
  return (
    <LegalPageShell
      title="AI Compliance & Enterprise FAQ"
      subtitle="Odpovede na GDPR, dáta, explainability a bezpečnosť. Posledná aktualizácia: 15. apríla 2026."
    >
      <EnterpriseFaqDocument />
    </LegalPageShell>
  );
}
