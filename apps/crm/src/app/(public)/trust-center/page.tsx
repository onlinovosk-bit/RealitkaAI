import Link from "next/link";
import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "Trust Center | Revolis.AI",
  description:
    "Security, privacy a legal podklady pre enterprise procurement: DPA, SLA detail, subprocessors, AI governance.",
};

const docs = [
  "MSA / DPA / SLA / VOP / Indemnification",
  "Subprocessor list + SCC/TIA posture",
  "AI governance annexy (change log, rollback, kill switch)",
  "BCP/DR a security controls schedule",
  "Sales legal checklist + redline fallback framework",
];

export default function TrustCenterPage() {
  return (
    <LegalPageShell
      title="Trust Center"
      subtitle="Enterprise due diligence podklady pre legal, security a procurement tímy."
    >
      <div className="space-y-6 text-sm text-slate-200">
        <section>
          <h2 className="text-lg font-semibold text-white">Čo získate v Trust Center balíku</h2>
          <ul className="mt-2 space-y-2">
            {docs.map((doc) => (
              <li key={doc} className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-slate-300">
                {doc}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
          <h3 className="font-semibold text-cyan-200">Self-service request</h3>
          <p className="mt-1 text-slate-300">
            Požiadajte o balík cez formulár. Odpovedáme prioritne v pracovné dni.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/dpa-request"
              className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Požiadať o DPA / Trust Center
            </Link>
            <a
              href="mailto:security@revolis.ai?subject=Enterprise%20Trust%20Center%20Request"
              className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-400"
            >
              Kontaktovať security tím
            </a>
          </div>
        </section>
      </div>
    </LegalPageShell>
  );
}
