import LegalPageShell from "@/components/legal/legal-page-shell";
import SupportRequestForm from "@/components/legal/support-request-form";

export const metadata = {
  title: "Support SLA | Revolis.AI",
  description: "Podpora, prioritizácia ticketov a reakčné časy pre klientov Revolis.AI.",
};

export default function SupportPage() {
  return (
    <LegalPageShell
      title="Support & Response SLA"
      subtitle="Prevádzkový model podpory pred prvým enterprise onboardingom."
    >
      <div className="space-y-6 text-sm text-slate-200">
        <section className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
          <h2 className="text-lg font-semibold text-white">Priorita incidentov</h2>
          <ul className="mt-2 space-y-1 text-slate-300">
            <li>- P1: služba nedostupná / kritický obchodný dopad</li>
            <li>- P2: degradácia funkcie bez úplného výpadku</li>
            <li>- P3: bežná funkčná chyba / workaround existuje</li>
            <li>- P4: otázky, kozmetické požiadavky, feature requests</li>
          </ul>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
          <h2 className="text-lg font-semibold text-white">Response target</h2>
          <ul className="mt-2 space-y-1 text-slate-300">
            <li>- P1: prvá odpoveď do 60 minút</li>
            <li>- P2: prvá odpoveď do 4 hodín</li>
            <li>- P3/P4: prvá odpoveď do 1 pracovného dňa</li>
          </ul>
        </section>

        <p className="text-slate-300">
          Kontakt:{" "}
          <a href="mailto:support@revolis.ai" className="underline text-cyan-300">
            support@revolis.ai
          </a>
          {" "}·{" "}
          <a href="tel:+421948444014" className="underline text-cyan-300">
            +421 948 444 014
          </a>
        </p>

        <section className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4">
          <h2 className="text-lg font-semibold text-white">Vytvoriť support ticket</h2>
          <p className="mt-1 text-slate-300">
            Ticket odošleme e-mailom aj do interného webhook/ticketing flowu (ak je nakonfigurovaný).
          </p>
          <div className="mt-4">
            <SupportRequestForm />
          </div>
        </section>
      </div>
    </LegalPageShell>
  );
}
