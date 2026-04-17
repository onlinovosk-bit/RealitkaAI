import EnterpriseVopDocument from "@/components/legal/documents/enterprise-vop-document";
import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "VOP — doplnok MSA | Revolis.AI",
  description: "Enterprise VOP — AUP, API limity a rozhodné právo (doplnok k MSA).",
};

export default function EnterpriseVopPage() {
  return (
    <LegalPageShell
      title="VOP — doplnok k MSA"
      subtitle="AUP, technické limity a spory — dopĺňa MSA. Verejné VOP pre self-serve sú na /terms. Posledná aktualizácia: 15. apríla 2026."
    >
      <EnterpriseVopDocument />
    </LegalPageShell>
  );
}
