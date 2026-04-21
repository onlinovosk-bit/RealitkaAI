import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "Ochrana osobných údajov – Revolis.AI",
  description: "Zásady ochrany osobných údajov Revolis.AI (GDPR)",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Ochrana osobných údajov"
      subtitle="Verzia 1.0 · Účinnosť od: 21. apríla 2026"
    >
      <div className="space-y-6 text-sm text-slate-400">
        <p>
          Prevádzkovateľ:{" "}
          <strong className="text-white">ONLINOVO, s. r. o.</strong>, Štúrova 130/25, 058 01
          Poprad · IČO: 54166942 ·{" "}
          <a href="tel:+421948444014" className="text-cyan-400 hover:underline">
            +421 948 444 014
          </a>{" "}
          ·{" "}
          <a href="mailto:privacy@revolis.ai" className="text-cyan-400 hover:underline">
            privacy@revolis.ai
          </a>
        </p>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Čo spracúvame</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Identifikačné údaje používateľov (meno, email)</li>
            <li>Kontaktné údaje leadov vložených do systému</li>
            <li>Údaje o správaní v aplikácii (anonymizované)</li>
            <li>Fakturačné údaje</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Právny základ</h2>
          <p>
            Plnenie zmluvy (čl. 6 ods. 1 písm. b) GDPR), splnenie právnej povinnosti (písm. c) a
            oprávnený záujem (písm. f).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Sub-procesori</h2>
          <p>
            Supabase, Vercel, OpenAI, Resend, Stripe, Twilio – všetci viazaní SCC zárukami.{" "}
            <a href="/legal/sub-processors" className="text-cyan-400 hover:underline">
              Úplný zoznam sub-procesorov →
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Vaše práva</h2>
          <p>
            Prístup, oprava, vymazanie, prenosnosť, námietka. Kontakt:{" "}
            <a href="mailto:privacy@revolis.ai" className="text-cyan-400">
              privacy@revolis.ai
            </a>
            . Sťažnosť:{" "}
            <a
              href="https://www.dataprotection.gov.sk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline"
            >
              dataprotection.gov.sk
            </a>
          </p>
        </section>

        <p className="text-xs text-slate-500">
          Detailná Privacy Policy:{" "}
          <a href="/privacy-policy" className="text-cyan-400 hover:underline">
            /privacy-policy
          </a>
        </p>
      </div>
    </LegalPageShell>
  );
}
