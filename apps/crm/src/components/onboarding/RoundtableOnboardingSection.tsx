"use client";

/**
 * Predajný / edukačný obsah inšpirovaný interným Roundtable dokumentom.
 * Neuvádza reálne citáty tretích osôb — len princípy a roadmapu modulov.
 */
export default function RoundtableOnboardingSection() {
  const taskRows: { task: string; time: string; aiLevel: string }[] = [
    { task: "Odpovede na nové leady", time: "~50 min", aiLevel: "90–100 % (rýchla odpoveď, 24/7)" },
    { task: "Follow-up na studené / teplé leady", time: "~60 min", aiLevel: "85–95 %" },
    { task: "Aktualizácia CRM po kontakte", time: "~40 min", aiLevel: "90–100 %" },
    { task: "Kvalifikácia leadov", time: "~50 min", aiLevel: "85 %+ (štruktúrovaný dialóg)" },
    { task: "Párovanie nehnuteľností", time: "~30 min", aiLevel: "90 %+ (dáta + ranking)" },
    { task: "Reportovanie klientom", time: "~25 min", aiLevel: "90–95 % (automatické reporty)" },
    { task: "Obhliadky (fyzicky)", time: "variabilné", aiLevel: "0 % (človek)" },
    { task: "Vyjednávanie a uzatváranie", time: "variabilné", aiLevel: "30 % (asistencia, rozhodnutie človek)" },
    { task: "Budovanie vzťahov / networking", time: "variabilné", aiLevel: "0 % (človek)" },
  ];

  const principles: { title: string; body: string }[] = [
    {
      title: "Rýchlosť",
      body: "Lead treba osloviť v prvých minútach. Pomalá odpoveď je stratená príležitosť — automatizácia ju drží pod kontrolou.",
    },
    {
      title: "Autonómia",
      body: "Opakujúce sa kroky patria do systému. Čím menej manuálnej práce, tým viac času na obhliadky a closing.",
    },
    {
      title: "Dôvera a audit",
      body: "Enterprise predaj vyžaduje vysvetliteľnosť a záznamy akcií — nie len „čiernu skrinku“.",
    },
  ];

  const modules: { id: string; name: string; kpi: string }[] = [
    { id: "M-01", name: "Okamžitá odpoveď na lead (response engine)", kpi: "P95 odozva, spokojnosť s odpoveďou" },
    { id: "M-02", name: "Lead scoring a pripravenosť kúpy", kpi: "Rýchla aktualizácia skóre, konverzné metriky" },
    { id: "M-03", name: "Plánovanie obhliadok", kpi: "Čas do potvrdenia slotu, no-show" },
    { id: "M-04", name: "Párovanie nehnuteľností", kpi: "Akceptácia top 3, latencia dotazu" },
    { id: "M-05", name: "Multi-touch follow-up", kpi: "Doručenie, otvorenosť, odozva" },
    { id: "M-06", name: "Automatizovaná CMA / cenová analýza", kpi: "Čas generovania, presnosť vs. trh" },
    { id: "M-07", name: "Obsah a inzeráty", kpi: "Čas na draft, schválenie prvého návrhu" },
    { id: "M-08", name: "Týždenné reporty (klient + maklér)", kpi: "Doručenie v pláne, otvorenosť" },
    { id: "M-09", name: "Konverzačná inteligencia", kpi: "Transkripcia, akčné body, návyky" },
    { id: "M-10", name: "Compliance a riziková vrstva", kpi: "Súhlasy, anonymizácia, audit log" },
  ];

  return (
    <section
      aria-labelledby="onboarding-roundtable-heading"
      className="space-y-6 rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-slate-50 to-white p-5 shadow-sm sm:p-6"
    >
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-800">Revolis AI · okrúhly stôl</p>
        <h2 id="onboarding-roundtable-heading" className="text-lg font-bold text-gray-900">
          Čo robí maklér denne — a kde AI prináša páku
        </h2>
        <p className="text-sm text-gray-600">
          Zhrnutie typického dňa podľa interných benchmarkov (industry analýzy). Čísla sú orientačné; cieľ je ukázať rozdelenie času medzi
          automatizovateľné úlohy a prácu, ktorá ostáva na človeka.
        </p>
      </header>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[min(100%,560px)] text-left text-xs sm:text-sm">
          <caption className="sr-only">Prehľad denných úloh makléra a miera vhodnosti pre AI</caption>
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Úloha
              </th>
              <th scope="col" className="whitespace-nowrap px-3 py-2.5 font-semibold">
                Čas / deň
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                AI úroveň (orientačne)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-800">
            {taskRows.map((row) => (
              <tr key={row.task} className="hover:bg-gray-50/80">
                <td className="px-3 py-2 align-top">{row.task}</td>
                <td className="whitespace-nowrap px-3 py-2 align-top text-gray-600">{row.time}</td>
                <td className="px-3 py-2 align-top text-gray-700">{row.aiLevel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <blockquote className="border-l-4 border-cyan-500 pl-4 text-sm italic text-gray-700">
        Z takejto analýzy vyplýva, že z približne 12 h pracovného dňa vie AI autonómne pokryť typicky 7–8 h opakovateľnej práce — maklér sa sústredí na
        obhliadky, vyjednávanie a dlhodobé vzťahy.
      </blockquote>

      <div className="grid gap-3 sm:grid-cols-3">
        {principles.map((p) => (
          <div key={p.title} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900">{p.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-gray-600">{p.body}</p>
          </div>
        ))}
      </div>

      <details className="rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
        <summary className="cursor-pointer list-none font-semibold text-gray-900 outline-none ring-cyan-500 focus-visible:ring-2 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            <span>10 modulov produktovej roadmapy (M-01–M-10)</span>
            <span className="text-cyan-700 text-xs font-normal">rozbaľ</span>
          </span>
        </summary>
        <p className="mt-3 text-xs text-gray-500">
          Nižšie sú ciele a KPI z interného plánu. Nie všetky moduly musia byť v každom nasadení zapnuté — závisí od integrácií a fáz rolloutu.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {modules.map((m) => (
            <li key={m.id} className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-xs">
              <span className="font-mono font-semibold text-cyan-900">{m.id}</span>{" "}
              <span className="font-medium text-gray-900">{m.name}</span>
              <span className="mt-1 block text-[11px] text-gray-600">KPI: {m.kpi}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
