import Link from "next/link";
import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "Legal & Compliance Hub | Revolis.AI",
  description:
    "Verejné právne a compliance informácie Revolis.AI: Privacy Policy, VOP, SLA prehľad a Security/Compliance rámec.",
};

const publicItems = [
  {
    title: "Zmluva o poskytovaní softvérových služieb",
    href: "/legal/zmluva-o-poskytovani-softverovych-sluzieb",
    description: "Rámcová SaaS zmluva (MSA-ready prehľad) pre enterprise procurement a podpisový proces.",
  },
  {
    title: "Privacy Policy",
    href: "/privacy-policy",
    description: "Ako spracúvame osobné údaje, právne základy, retention a práva dotknutých osôb.",
  },
  {
    title: "VOP / Terms",
    href: "/terms",
    description: "Zmluvné podmienky pre self-serve režim, fair use, technické limity a export dát.",
  },
  {
    title: "Security & Compliance",
    href: "/security",
    description: "Bezpečnostné opatrenia, GDPR posture, AI governance princípy a incident režim.",
  },
  {
    title: "Service Status",
    href: "/status",
    description: "Verejný status kľúčových služieb a incident komunikačný štandard.",
  },
  {
    title: "Trust Center",
    href: "/trust-center",
    description: "Enterprise due diligence vstup: DPA request, security/legal podklady a procurement flow.",
  },
  {
    title: "Cookie Policy",
    href: "/cookie-policy",
    description: "Cookies, consent management a správa preferencií.",
  },
  {
    title: "Legal Changelog",
    href: "/legal/changelog",
    description: "Transparentná história právnych a compliance zmien.",
  },
  {
    title: "Support SLA",
    href: "/support",
    description: "Response časy, priority incidentov a support operating model.",
  },
  {
    title: "First Client Readiness",
    href: "/legal/first-client-readiness",
    description: "14-dňový prioritný plán pred oslovením prvého klienta.",
  },
  {
    title: "Release Quality Gate",
    href: "/legal/quality-gate",
    description: "D1 quality baseline: testy, monitoring, rollback, owneri a Go/No-Go kritériá.",
  },
  {
    title: "Observability Baseline (D2)",
    href: "/status/observability",
    description: "Alert pravidlá pre auth, billing, API 5xx, dashboard load + severity map P1-P4.",
  },
  {
    title: "Fallback Matrix (D3)",
    href: "/status/fallbacks",
    description: "Kritické endpointy, retry stratégia a fallback UI správanie pre prod hardening II.",
  },
  {
    title: "Incident Cleanup Log (D4)",
    href: "/status/incidents",
    description: "RCA log pre uzatvorené P1/P2 incidenty + guard testy a prevencia.",
  },
];

const internalItems = [
  "Podpisové redline verzie MSA/DPA/SLA/Indemnification",
  "Security evidence pack (detailné test reports a interné kontroly)",
  "Procurement Q&A pack pre enterprise due diligence",
];

export default function LegalHubPage() {
  return (
    <LegalPageShell
      title="Legal & Compliance Hub"
      subtitle="Verejne dostupné právne a compliance dokumenty Revolis.AI."
    >
      <div className="space-y-4">
        {publicItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-xl border border-slate-700 bg-slate-950/50 p-4 transition-colors hover:border-cyan-300"
          >
            <h2 className="text-lg font-semibold text-cyan-200">{item.title}</h2>
            <p className="mt-1 text-sm text-slate-300">{item.description}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
        <p className="text-sm text-emerald-200">
          Enterprise due diligence dokumenty (DPA template, detailné SLA annexy, security evidence pack) poskytujeme
          cez Trust Center proces na vyžiadanie.
        </p>
        <div className="mt-3 rounded-lg border border-emerald-400/20 bg-slate-950/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-300">Interné / na vyžiadanie</p>
          <ul className="mt-2 space-y-1 text-xs text-emerald-100/90">
            {internalItems.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
        <a
          href="mailto:legal@revolis.ai?subject=Trust%20Center%20Request"
          className="mt-3 inline-block rounded-full border border-emerald-400/40 px-4 py-2 text-xs font-semibold text-emerald-100 transition-colors hover:border-emerald-300"
        >
          Požiadať o Trust Center balík
        </a>
      </div>
    </LegalPageShell>
  );
}
