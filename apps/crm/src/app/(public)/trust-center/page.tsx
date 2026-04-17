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

        <section>
          <h2 className="text-lg font-semibold text-white">Verejný právny balík (online)</h2>
          <p className="mt-2 text-slate-300">
            Základné texty MSA, DPA, SLA, odškodnenia, VOP doplnku, FAQ a checklist nájdete na samostatných stránkach — v
            rovnakej štruktúre ako v Trust Center balíku na podpis.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <Link href="/legal/msa" className="text-cyan-400 underline hover:text-cyan-300">
              MSA
            </Link>
            <span className="text-slate-600" aria-hidden>
              ·
            </span>
            <Link href="/legal/dpa" className="text-cyan-400 underline hover:text-cyan-300">
              DPA
            </Link>
            <span className="text-slate-600" aria-hidden>
              ·
            </span>
            <Link href="/legal/sla" className="text-cyan-400 underline hover:text-cyan-300">
              SLA
            </Link>
            <span className="text-slate-600" aria-hidden>
              ·
            </span>
            <Link href="/privacy-policy" className="text-cyan-400 underline hover:text-cyan-300">
              Privacy
            </Link>
            <span className="text-slate-600" aria-hidden>
              ·
            </span>
            <Link href="/legal/enterprise-faq" className="text-cyan-400 underline hover:text-cyan-300">
              FAQ
            </Link>
          </div>
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
