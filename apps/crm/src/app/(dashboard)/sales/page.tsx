"use client";
import { useEffect, useState } from "react";
import { getLeads, type Lead } from "@/lib/leads-store";
import Link from "next/link";

function StatCard({ label, value, sub, color = "gray" }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    gray: "border-gray-200",
    green: "border-green-200 bg-green-50",
    blue: "border-blue-200 bg-blue-50",
    orange: "border-orange-200 bg-orange-50",
  };
  return (
    <div className={`rounded-2xl border p-5 bg-white ${colors[color]}`}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

const STAGE_ORDER = ["Nový", "Teplý", "Horúci", "Obhliadka", "Ponuka"];
const STAGE_COLORS: Record<string, string> = {
  Nový: "bg-gray-200",
  Teplý: "bg-blue-400",
  Horúci: "bg-orange-400",
  Obhliadka: "bg-violet-500",
  Ponuka: "bg-green-500",
};

export default function SalesPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeads().then(data => { setLeads(data); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="p-6 text-gray-400 animate-pulse">Načítavam dáta...</div>
  );

  // --- Výpočty ---
  const total = leads.length;
  const byStatus = STAGE_ORDER.reduce((acc, s) => {
    acc[s] = leads.filter(l => l.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const hotLeads = (byStatus["Horúci"] || 0) + (byStatus["Obhliadka"] || 0) + (byStatus["Ponuka"] || 0);
  const avgScore = total > 0 ? Math.round(leads.reduce((s, l) => s + (l.score || 0), 0) / total) : 0;
  const avgBudget = total > 0
    ? Math.round(leads.reduce((s, l) => s + (Number(l.budget) || 0), 0) / total)
    : 0;
  const conversionRate = total > 0 ? Math.round((hotLeads / total) * 100) : 0;

  // Top leady podľa skóre
  const topLeads = [...leads].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5);

  // Leady podľa zdroja
  const bySrc = leads.reduce((acc, l) => {
    const src = l.source || "Iné";
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topSources = Object.entries(bySrc).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales</h1>
          <p className="text-gray-500 mt-1">Prehľad predajného výkonu a pipeline.</p>
        </div>
        <Link href="/leads"
          className="text-sm font-semibold bg-gray-900 text-white px-4 py-2 rounded-xl hover:bg-gray-700 transition">
          ➕ Nový lead
        </Link>
      </div>

      {/* KPI karty */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Celkové leady" value={total} sub="V aktívnom pipeline" />
        <StatCard label="Horúce príležitosti" value={hotLeads} sub="Obhliadka + Ponuka + Horúci" color="orange" />
        <StatCard label="Konverzný pomer" value={`${conversionRate}%`} sub="% leadov v pokročilej fáze" color="green" />
        <StatCard label="Priemerné AI skóre" value={avgScore} sub="Z 100 bodov" color="blue" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Pipeline funnel */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-bold text-gray-900 mb-4">Pipeline — fázy predaja</h2>
          <div className="space-y-3">
            {STAGE_ORDER.map(stage => {
              const count = byStatus[stage] || 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={stage}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{stage}</span>
                    <span className="text-gray-500">{count} leadov ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${STAGE_COLORS[stage]}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Zdroje leadov */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-bold text-gray-900 mb-4">Zdroje leadov</h2>
          {topSources.length === 0 ? (
            <p className="text-sm text-gray-400">Žiadne dáta</p>
          ) : (
            <div className="space-y-3">
              {topSources.map(([src, count]) => {
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={src}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{src}</span>
                      <span className="text-gray-500">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top 5 leadov */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Top leady podľa AI skóre</h2>
          <Link href="/leads" className="text-sm text-blue-600 hover:underline">Zobraziť všetky →</Link>
        </div>
        {topLeads.length === 0 ? (
          <p className="text-sm text-gray-400">Žiadne leady. <Link href="/leads" className="text-blue-600 underline">Pridaj prvý lead.</Link></p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
                  <th className="pb-2 pr-4">Klient</th>
                  <th className="pb-2 pr-4">Lokalita</th>
                  <th className="pb-2 pr-4">Rozpočet</th>
                  <th className="pb-2 pr-4">Stav</th>
                  <th className="pb-2">AI Skóre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topLeads.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="py-2.5 pr-4">
                      <Link href={`/leads/${lead.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {lead.name}
                      </Link>
                      <div className="text-xs text-gray-400">{lead.email}</div>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-600">{lead.location}</td>
                    <td className="py-2.5 pr-4 text-gray-600">
                      {lead.budget ? `${Number(lead.budget).toLocaleString("sk")} €` : "—"}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium
                        ${lead.status === "Horúci" ? "bg-orange-100 text-orange-700" :
                          lead.status === "Ponuka" ? "bg-green-100 text-green-700" :
                          lead.status === "Obhliadka" ? "bg-violet-100 text-violet-700" :
                          "bg-gray-100 text-gray-600"}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className={`font-bold ${(lead.score || 0) >= 75 ? "text-green-600" : (lead.score || 0) >= 50 ? "text-orange-500" : "text-gray-400"}`}>
                        {lead.score}/100
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI insight */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="font-bold text-gray-900 mb-1">AI Sales Insight</h3>
            <p className="text-sm text-gray-600">
              {hotLeads > 0
                ? `Máš ${hotLeads} leadov v pokročilej fáze — odporúčam ich kontaktovať do 24h. Priemerný rozpočet je ${avgBudget.toLocaleString("sk")} €.`
                : "Zatiaľ nemáš leady v pokročilej fáze. Začni pridaním leadov a AI automaticky vyhodnotí ich pripravenosť na kúpu."}
            </p>
            <Link href="/leads" className="mt-2 inline-block text-sm font-semibold text-blue-700 hover:underline">
              Zobraziť leady →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
