import Link from "next/link";

const FOUNDER_PRIORITY_STEPS = [
  {
    title: "Supabase / infra — kvóty a billing",
    body: "Vyrieš prekročenie usage limits (Organisation billing). Bez toho hrozí výpadok alebo throttling.",
  },
  {
    title: "ONE thing pitch",
    body: "Schváliť jednovetný pitch a zoznam add-onov v súbore docs/product-one-thing.md a použiť ich v obchode.",
  },
  {
    title: "GDPR vlastník + checklist",
    body: "Meno zodpovednej osoby a vyplnený súbor docs/gdpr-operational-checklist.md (s právníkom).",
  },
  {
    title: "Adopcia maklérov (champion + WAU)",
    body: "Champion v pilotnej kancelárii; metrika WAU maklérov, nie len platiteľ účtu.",
  },
  {
    title: "Expanzia (napr. CZ)",
    body: "Rozhodnutie a vlastník; ak áno — lokálny kontakt alebo partner do konkrétneho dátumu.",
  },
  {
    title: "Transparentnosť metrík",
    body: "Jedna strana: čo vidí agent vs. manažér; komunikácia na porade, nie potichu.",
  },
  {
    title: "Pilot 30 dní",
    body: "Jedna kancelária, žiadne nové moduly — len primárna hodnota a dáta v CRM.",
  },
];

export default function OperationalTrustPage() {
  return (
    <div className="mx-auto max-w-3xl p-4 md:p-10 font-sans" style={{ background: "#050914", minHeight: "100vh" }}>
      <Link href="/settings" className="text-sm" style={{ color: "#64748B" }}>
        ← Nastavenia
      </Link>
      <h1 className="mt-4 text-2xl font-black tracking-tight" style={{ color: "#F0F9FF" }}>
        Prevádzková istota
      </h1>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: "#64748B" }}>
        Skratka k pre-mortem mitigáciám: čo už rieši produkt, a čo musíte mať pod kontrolou vy (vedenie,
        právnik, obchod). Plná tabuľka a checkboxy sú v repozitári v{" "}
        <code className="text-cyan-300/90">apps/crm/docs/premortem-mitigations.md</code>.
      </p>

      <section className="mt-8 rounded-2xl border p-5" style={{ background: "#080D1A", borderColor: "#0F1F3D" }}>
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "#475569" }}>
          Vaše kroky (zoradené podľa priority)
        </h2>
        <ol className="mt-4 list-decimal space-y-4 pl-5 text-sm" style={{ color: "#94A3B8" }}>
          {FOUNDER_PRIORITY_STEPS.map((item) => (
            <li key={item.title}>
              <span className="font-semibold text-slate-200">{item.title}</span>
              <p className="mt-1 leading-relaxed" style={{ color: "#64748B" }}>
                {item.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6 rounded-2xl border p-5" style={{ background: "#080D1A", borderColor: "#0F1F3D" }}>
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "#475569" }}>
          Už v produkte (orientačne)
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm" style={{ color: "#94A3B8" }}>
          <li>AI triáž — vysvetlenie pre makléra + spätná väzba (Áno/Nie).</li>
          <li>Koučovací rámec pri tímovej analytike a management dashboarde.</li>
          <li>Viditeľnosť triáže: /settings/ai-triage (po nasadení migrácií).</li>
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border p-5" style={{ background: "#080D1A", borderColor: "#0F1F3D" }}>
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "#475569" }}>
          Dokumenty pre tím
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm" style={{ color: "#94A3B8" }}>
          <li>
            <code className="text-slate-500">docs/product-one-thing.md</code> — ONE thing, add-on, ďalší AI povrch
          </li>
          <li>
            <code className="text-slate-500">docs/premortem-mitigations.md</code> — plná mapa scenárov
          </li>
          <li>
            <code className="text-slate-500">docs/tech-ownership.md</code> — vlastníctvo kódu (doplňte mená)
          </li>
          <li>
            <code className="text-slate-500">docs/gdpr-operational-checklist.md</code> — GDPR prevádzka
          </li>
        </ul>
      </section>
    </div>
  );
}
