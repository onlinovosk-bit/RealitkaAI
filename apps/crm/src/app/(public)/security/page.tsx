import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "Security & Compliance | Revolis.AI",
  description:
    "Bezpečnostný a compliance prehľad Revolis.AI: GDPR posture, AI governance, incident management a BCP/DR.",
};

const controls = [
  "Šifrovanie dát in-transit (TLS 1.3) a at-rest (AES-256).",
  "Riadenie prístupov cez RBAC, MFA pre privilegované účty a princíp najmenších oprávnení.",
  "Monitoring, audit logging a incident response proces so severity klasifikáciou.",
  "BCP/DR rámec s RTO/RPO cieľmi a pravidelným testovaním obnovy.",
  "AI change governance, rollback režim a human oversight pre kritické workflowy.",
  "Subprocessor governance, SCC/TIA mechanizmy pre relevantné transfery mimo EÚ/EHP.",
];

export default function SecurityPage() {
  return (
    <LegalPageShell
      title="Security & Compliance"
      subtitle="Prehľad bezpečnostných, privacy a AI governance princípov. Posledná aktualizácia: 15. apríla 2026."
    >
      <div className="space-y-6 text-sm text-slate-200">
        <section>
          <h2 className="text-lg font-semibold text-white">Security baseline</h2>
          <ul className="mt-3 space-y-2 text-slate-300">
            {controls.map((item) => (
              <li key={item} className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Compliance scope</h2>
          <p className="mt-2 text-slate-300">
            Revolis.AI udržiava zmluvný rámec pre GDPR, enterprise procurement a AI governance (MSA, DPA, SLA,
            Indemnification, VOP + annexy).
          </p>
        </section>

        <section className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4">
          <p className="text-slate-200">
            Pre detailný Trust Center balík (DPA template, security evidence, annexy) napíšte na{" "}
            <a href="mailto:security@revolis.ai" className="font-semibold text-cyan-200 underline">
              security@revolis.ai
            </a>
            .
          </p>
        </section>
      </div>
    </LegalPageShell>
  );
}
