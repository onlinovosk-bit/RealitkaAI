import LegalPageShell from "@/components/legal/legal-page-shell";
import DpaRequestForm from "@/components/legal/dpa-request-form";

export const metadata = {
  title: "DPA Request | Revolis.AI",
  description: "Požiadajte o DPA template a enterprise privacy dokumentáciu.",
};

export default function DpaRequestPage() {
  return (
    <LegalPageShell
      title="DPA Request"
      subtitle="Požiadajte o DPA template, subprocessor list a privacy compliance podklady."
    >
      <DpaRequestForm />
    </LegalPageShell>
  );
}
