import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "Cookie Policy – Revolis.AI",
  description: "Informácie o používaní cookies na Revolis.AI",
};

export default function CookiesPage() {
  return (
    <LegalPageShell
      title="Cookie Policy"
      subtitle="Verzia 1.0 · Účinnosť od: 21. apríla 2026"
    >
      <div className="space-y-6 text-sm text-slate-400">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Čo sú cookies</h2>
          <p>
            Cookies sú malé textové súbory ukladané vo vašom prehliadači. Používame ich výhradne
            na fungovanie prihlásenia, preferencií a anonymnej analytiky.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Typy cookies</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-slate-200">Nevyhnutné</strong> – session, CSRF token,
              autentifikácia
            </li>
            <li>
              <strong className="text-slate-200">Analytické</strong> – Google Analytics 4
              (anonymizované IP)
            </li>
            <li>
              <strong className="text-slate-200">Funkčné</strong> – uložené preferencie UI
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Ako odmietnuť</h2>
          <p>
            Analytické cookies môžete odmietnuť v nastaveniach prehliadača alebo cez banner pri
            prvej návšteve. Nevyhnutné cookies sa vypnúť nedajú – sú potrebné pre fungovanie
            aplikácie.
          </p>
        </section>

        <p className="text-xs text-slate-500">
          Detailná Cookie Policy:{" "}
          <a href="/cookie-policy" className="text-cyan-400 hover:underline">
            /cookie-policy
          </a>{" "}
          · Otázky:{" "}
          <a href="mailto:privacy@revolis.ai" className="text-cyan-400">
            privacy@revolis.ai
          </a>
        </p>
      </div>
    </LegalPageShell>
  );
}
