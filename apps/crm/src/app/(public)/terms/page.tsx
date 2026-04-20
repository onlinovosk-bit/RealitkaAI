import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "VOP / Terms | Revolis.AI",
  description: "Všeobecné obchodné podmienky Revolis.AI pre self-serve zákazníkov.",
};

export default function TermsPage() {
  return (
    <LegalPageShell
      title="VOP / Terms"
      subtitle="Všeobecné obchodné podmienky pre používanie Revolis.AI. Posledná aktualizácia: 15. apríla 2026."
    >
      <div className="space-y-6 text-sm text-slate-200">
        <section>
          <h2 className="text-lg font-semibold text-white">1. Licencia a povolené používanie</h2>
          <p className="mt-2 text-slate-300">
            Zákazník získava neexkluzívnu licenciu na interné obchodné účely v rozsahu predplateného plánu.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">2. Fair use a technické limity</h2>
          <p className="mt-2 text-slate-300">
            Používanie API a exportu podlieha limitom podľa plánu. Zakázané je zneužitie služby, spamovanie a
            harvesting dát.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">3. AI a duševné vlastníctvo</h2>
          <p className="mt-2 text-slate-300">
            AI logika je poskytovaná ako black-box služba. Reverse engineering, odvodenie logiky systému a benchmarking
            bez súhlasu sú zmluvne zakázané.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">4. Ukončenie a export dát</h2>
          <p className="mt-2 text-slate-300">
            Po ukončení služby má zákazník obmedzenú lehotu na export dát v štandardných formátoch. Následne sa dáta
            bezpečne vymažú podľa retention pravidiel.
          </p>
        </section>

        <section className="rounded-lg border border-slate-700 bg-slate-950/60 p-4 text-xs text-slate-300">
          Tento prehľad je skrátená verzia. Zmluvne záväzné je úplné znenie VOP v kontraktačnej dokumentácii.
        </section>
      </div>
    </LegalPageShell>
  );
}
