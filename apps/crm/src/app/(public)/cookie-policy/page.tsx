import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "Cookie Policy | Revolis.AI",
  description: "Informácie o používaní cookies a podobných technológií v Revolis.AI.",
};

export default function CookiePolicyPage() {
  return (
    <LegalPageShell
      title="Cookie Policy"
      subtitle="Ako Revolis.AI používa cookies na bezpečnosť, funkčnosť a voliteľnú analytiku."
    >
      <div className="space-y-6 text-sm text-slate-200">
        <section>
          <h2 className="text-lg font-semibold text-white">1. Typy cookies</h2>
          <p className="mt-2 text-slate-300">
            Používame nevyhnutné cookies pre prihlásenie, bezpečnosť a stabilitu služby. Voliteľné analytické cookies
            používame iba so súhlasom používateľa.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">2. Účel spracovania</h2>
          <p className="mt-2 text-slate-300">
            Nevyhnutné cookies sú potrebné na poskytovanie služby. Voliteľné cookies pomáhajú zlepšovať používateľskú
            skúsenosť a produktové rozhodovanie.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">3. Správa súhlasu</h2>
          <p className="mt-2 text-slate-300">
            Súhlas môžete zmeniť cez cookie banner alebo na požiadanie cez support. Odmietnutie voliteľných cookies
            nemá vplyv na základnú funkčnosť služby.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">4. Kontakt</h2>
          <p className="mt-2 text-slate-300">
            Otázky k cookies a ochrane súkromia:{" "}
            <a href="mailto:privacy@revolis.ai" className="underline text-cyan-300">
              privacy@revolis.ai
            </a>
            .
          </p>
        </section>
      </div>
    </LegalPageShell>
  );
}
