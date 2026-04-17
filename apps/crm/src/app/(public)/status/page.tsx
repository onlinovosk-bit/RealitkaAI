import LegalPageShell from "@/components/legal/legal-page-shell";
import ServiceStatusCards from "@/components/legal/service-status-cards";
import Link from "next/link";

export const metadata = {
  title: "Service Status | Revolis.AI",
  description: "Verejný prehľad stavu služby Revolis.AI a incident komunikačný štandard.",
};

export default function StatusPage() {
  return (
    <LegalPageShell
      title="Service Status"
      subtitle="Transparentný prehľad dostupnosti služieb a incident komunikácie."
    >
      <div className="space-y-6">
        <ServiceStatusCards />

        <section className="rounded-xl border border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-300">
          <h2 className="text-lg font-semibold text-white">Incident communication standard</h2>
          <ul className="mt-2 space-y-1">
            <li>- P1 incident: prvý update do 60 minút od potvrdenia.</li>
            <li>- Následné updaty: minimálne každé 4 hodiny do stabilizácie.</li>
            <li>- Postmortem: do 5 pracovných dní.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4 text-sm">
          <p className="text-slate-200">
            D2 observability baseline (monitoring rules + severity map) je dostupný na{" "}
            <Link href="/status/observability" className="font-semibold text-cyan-200 underline">
              /status/observability
            </Link>
            {" "}a fallback matrix (D3) na{" "}
            <Link href="/status/fallbacks" className="font-semibold text-cyan-200 underline">
              /status/fallbacks
            </Link>
            {" "}a incident cleanup log (D4) na{" "}
            <Link href="/status/incidents" className="font-semibold text-cyan-200 underline">
              /status/incidents
            </Link>
            .
          </p>
        </section>

        <p className="text-xs text-slate-500">Aktualizované automaticky pri načítaní stránky.</p>
      </div>
    </LegalPageShell>
  );
}
