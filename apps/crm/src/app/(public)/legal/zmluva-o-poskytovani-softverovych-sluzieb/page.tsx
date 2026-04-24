import Link from "next/link";
import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "Zmluva o poskytovaní softvérových služieb | Revolis.AI",
  description:
    "Enterprise-ready rámcová zmluva pre SaaS služby Revolis.AI vrátane GDPR, SLA, AI governance a Trust Center flow.",
};

const keyTerms = [
  "SaaS licencia je nevýhradná, neprenosná a viazaná na objednaný plán.",
  "DPA a sub-procesori sú dostupní cez Trust Center request flow.",
  "AI výstupy sú decision-support; právne a obchodné finálne rozhodnutie ostáva na klientovi.",
  "Rollback a kill-switch pre kritické AI workflowy sú súčasťou enterprise governance.",
  "Incident reporting a SLA režim sú naviazané na Support/Security dokumentáciu.",
];

const enterpriseAnnexes = [
  { title: "DPA (Data Processing Agreement)", href: "/dpa-request" },
  { title: "Sub-procesori", href: "/legal/sub-processors" },
  { title: "Security & Compliance", href: "/security" },
  { title: "Support SLA", href: "/support" },
  { title: "Legal Changelog", href: "/legal/changelog" },
];

export default function SaaSAgreementPage() {
  return (
    <LegalPageShell
      title="Zmluva o poskytovaní softvérových služieb"
      subtitle="Rámcová enterprise-ready zmluva pre platformu Revolis.AI. Posledná aktualizácia: 20. apríla 2026."
    >
      <div className="space-y-6 text-sm text-slate-200">
        <section className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4">
          <h2 className="text-lg font-semibold text-white">Účel zmluvy</h2>
          <p className="mt-2 text-slate-300">
            Táto zmluva upravuje poskytovanie cloudovej platformy Revolis.AI v režime SaaS, vrátane licencie,
            zodpovedností strán, ochrany osobných údajov, bezpečnosti, SLA a AI governance mechanizmov.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Kľúčové zmluvné body</h2>
          <ul className="mt-3 space-y-2">
            {keyTerms.map((term) => (
              <li key={term} className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-slate-300">
                {term}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Štruktúra dokumentácie</h2>
          <p className="mt-2 text-slate-300">
            Verejná verzia je právny prehľad. Podpisové enterprise annexy (vrátane redline-ready verzií) sú poskytované
            cez Trust Center na vyžiadanie.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/trust-center"
              className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Otvoriť Trust Center flow
            </Link>
            <a
              href="mailto:legal@revolis.ai?subject=Enterprise%20MSA%20Request"
              className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-400"
            >
              Požiadať o podpisový balík
            </a>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Súvisiace právne dokumenty</h2>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {enterpriseAnnexes.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs text-cyan-200 hover:border-cyan-300"
              >
                {item.title}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </LegalPageShell>
  );
}
