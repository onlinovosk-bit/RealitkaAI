import DpaDocument from "@/components/legal/documents/dpa-document";
import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "DPA (GDPR) | Revolis.AI",
  description: "Data Processing Agreement podľa GDPR — Revolis.AI ako spracovateľ.",
};

export default function DpaPage() {
  return (
    <LegalPageShell
      title="Data Processing Agreement (DPA)"
      subtitle="Spracovanie osobných údajov v súlade s GDPR. Posledná aktualizácia: 15. apríla 2026."
    >
      <DpaDocument />
    </LegalPageShell>
  );
}
