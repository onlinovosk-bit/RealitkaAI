import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "SLA – Revolis.AI",
  description: "Service Level Agreement – dohoda o úrovni služby Revolis.AI",
};

const slaTable = [
  { plan: "Štarter", uptime: "99,0 %", responseTime: "48h", credit: "5 %" },
  { plan: "Pro", uptime: "99,5 %", responseTime: "4h", credit: "10 %" },
  { plan: "Enterprise", uptime: "99,9 %", responseTime: "1h", credit: "25 %" },
];

export default function SlaPage() {
  return (
    <LegalPageShell
      title="SLA – Dohoda o úrovni služby"
      subtitle="Verzia 1.0 · Účinnosť od: 21. apríla 2026"
    >
      <div className="space-y-6 text-sm text-slate-400">
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Garancie dostupnosti</h2>
          <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #112240" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#0A1628" }}>
                  {["Plán", "Uptime", "Reakčná doba", "Servisný kredit"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider"
                      style={{ color: "#64748B" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slaTable.map((row, i) => (
                  <tr
                    key={row.plan}
                    className="border-t"
                    style={{
                      borderColor: "#112240",
                      background: i % 2 === 0 ? "#050914" : "#0A1628",
                    }}
                  >
                    <td className="px-4 py-3 font-semibold text-white">{row.plan}</td>
                    <td className="px-4 py-3" style={{ color: "#22D3EE" }}>
                      {row.uptime}
                    </td>
                    <td className="px-4 py-3">{row.responseTime}</td>
                    <td className="px-4 py-3">{row.credit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Výluky zo SLA</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Plánovaná údržba (oznámená min. 24h vopred)</li>
            <li>Výpadky spôsobené treťou stranou (Supabase, Vercel, OpenAI)</li>
            <li>Vyššia moc (force majeure)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Uplatnenie kreditu</h2>
          <p>
            Kredit je potrebné uplatniť do 30 dní od výpadku na{" "}
            <a href="mailto:support@revolis.ai" className="text-cyan-400">
              support@revolis.ai
            </a>
            . Kredit sa uplatňuje na nasledujúcu faktúru.
          </p>
        </section>
      </div>
    </LegalPageShell>
  );
}
