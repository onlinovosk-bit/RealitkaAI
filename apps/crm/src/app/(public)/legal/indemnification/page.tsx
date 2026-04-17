import IndemnificationDocument from "@/components/legal/documents/indemnification-document";
import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "Odškodnenie | Revolis.AI",
  description: "Indemnification clause — obojstranné odškodnenie a limit zodpovednosti.",
};

export default function IndemnificationPage() {
  return (
    <LegalPageShell
      title="Doložka o odškodnení (Indemnification)"
      subtitle="Súčasť MSA — odškodnenie a obmedzenie zodpovednosti. Posledná aktualizácia: 15. apríla 2026."
    >
      <IndemnificationDocument />
    </LegalPageShell>
  );
}
