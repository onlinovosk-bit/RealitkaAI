import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "Privacy Policy | Revolis.AI",
  description: "Zásady ochrany osobných údajov pre Revolis.AI.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      subtitle="Zásady ochrany osobných údajov pre Revolis.AI. Posledná aktualizácia: 15. apríla 2026."
    >
      <div className="space-y-6 text-sm text-slate-200">
        <section>
          <h2 className="text-lg font-semibold text-white">1. Kto spracúva údaje</h2>
          <p className="mt-2 text-slate-300">
            Prevádzkovateľom platformy je Revolis.AI. Pri poskytovaní SaaS služieb môžeme vystupovať ako
            prevádzkovateľ aj sprostredkovateľ podľa typu spracúvania.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">2. Aké údaje spracúvame</h2>
          <p className="mt-2 text-slate-300">
            Kontaktné údaje, údaje o interakcii v CRM, údaje súvisiace s obchodnými príležitosťami a prevádzkové logy
            potrebné na poskytovanie služby, bezpečnosť a podporu.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">3. Právne základy a účel</h2>
          <p className="mt-2 text-slate-300">
            Údaje spracúvame na plnenie zmluvy, splnenie zákonných povinností, oprávnený záujem a v relevantných
            prípadoch na základe súhlasu.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">4. Prenosy mimo EÚ/EHP</h2>
          <p className="mt-2 text-slate-300">
            Pri cezhraničných prenosoch používame primerané záruky vrátane SCC a doplnkových opatrení (TIA), ak je to
            potrebné.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">5. Práva dotknutých osôb</h2>
          <p className="mt-2 text-slate-300">
            Máte právo na prístup, opravu, vymazanie, obmedzenie, prenosnosť a námietku. Žiadosti posielajte na
            privacy@revolis.ai.
          </p>
        </section>

        <section className="rounded-lg border border-slate-700 bg-slate-950/60 p-4 text-xs text-slate-300">
          Kompletné právne znenie je dostupné na vyžiadanie v Trust Center balíku alebo v zmluvnej dokumentácii.
        </section>
      </div>
    </LegalPageShell>
  );
}
