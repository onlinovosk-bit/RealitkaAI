import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "Sub-procesori – Revolis.AI",
  description: "Zoznam cloudových sub-procesorov Revolis.AI a ich GDPR záruky",
};

const list = [
  { name: "Supabase", country: "USA/EÚ", purpose: "Databáza, autentifikácia", guarantee: "SCC" },
  { name: "Vercel", country: "USA", purpose: "Hosting, deployment", guarantee: "SCC" },
  { name: "OpenAI", country: "USA", purpose: "AI engine", guarantee: "SCC" },
  { name: "Resend", country: "USA", purpose: "Transakčné emaily", guarantee: "SCC" },
  { name: "Stripe", country: "USA/EÚ", purpose: "Platby, billing", guarantee: "SCC" },
  { name: "Twilio", country: "USA", purpose: "SMS notifikácie", guarantee: "SCC" },
  {
    name: "Google Analytics",
    country: "USA",
    purpose: "Anonymizovaná analytika webu",
    guarantee: "SCC",
  },
];

export default function SubProcessorsPage() {
  return (
    <LegalPageShell
      title="Sub-procesori"
      subtitle="Aktualizované: 21. apríla 2026"
    >
      <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #112240" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#0A1628" }}>
              {["Subjekt", "Krajina", "Účel", "Záruky"].map((h) => (
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
            {list.map((p, i) => (
              <tr
                key={p.name}
                className="border-t"
                style={{
                  borderColor: "#112240",
                  background: i % 2 === 0 ? "#050914" : "#0A1628",
                }}
              >
                <td className="px-4 py-3 font-semibold text-white">{p.name}</td>
                <td className="px-4 py-3 text-slate-400">{p.country}</td>
                <td className="px-4 py-3 text-slate-400">{p.purpose}</td>
                <td className="px-4 py-3">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs"
                    style={{ background: "rgba(34,211,238,0.08)", color: "#22D3EE" }}
                  >
                    {p.guarantee}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs mt-4 text-slate-500">
        Zmeny budú oznámené 30 dní vopred emailom. Otázky:{" "}
        <a href="mailto:privacy@revolis.ai" className="text-cyan-400 hover:underline">
          privacy@revolis.ai
        </a>
      </p>
    </LegalPageShell>
  );
}
