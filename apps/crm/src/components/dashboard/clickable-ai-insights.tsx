"use client";

import Link from "next/link";
import type { Lead } from "@/lib/leads-store";

function computeInsights(leads: Lead[]) {
  const urgentLeads = leads.filter((l) => l.status === "Horúci" || l.score >= 80);

  const sourceCounts: Record<string, number> = {};
  leads.forEach((l) => {
    sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1;
  });
  const topSourceEntry = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0];
  const topSourcePct =
    leads.length > 0 ? Math.round(((topSourceEntry?.[1] ?? 0) / leads.length) * 100) : 0;

  const locationCounts: Record<string, number> = {};
  leads.forEach((l) => {
    const city = l.location.split(" - ")[0].trim();
    if (city) locationCounts[city] = (locationCounts[city] || 0) + 1;
  });
  const topLocations = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k);

  const ponukaLeads = leads.filter((l) => l.status === "Ponuka").length;
  const avgScore =
    leads.length > 0
      ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length)
      : 0;

  return { urgentLeads, topSourceEntry, topSourcePct, topLocations, ponukaLeads, avgScore };
}

export default function ClickableAiInsights({ leads }: { leads: Lead[] }) {
  const { urgentLeads, topSourceEntry, topSourcePct, topLocations, ponukaLeads, avgScore } =
    computeInsights(leads);

  const insights = [
    {
      id: "1",
      title: "Urgentné kontakty",
      description:
        urgentLeads.length > 0
          ? `${urgentLeads.length} klientov s vysokou prioritou čaká na kontakt.`
          : "Žiadne urgentné kontakty momentálne.",
      action: "Zobraziť leady",
      href: "/leads",
      color: "bg-green-50 border-green-200",
      textColor: "text-green-700",
    },
    {
      id: "2",
      title: "Trendy v lokalitách",
      description:
        topLocations.length > 0
          ? `${topLocations.join(" a ")} sú najžiadanejšie lokality v databáze.`
          : "Doplňte lokality do leadov pre analýzu.",
      action: "Filtrovať podľa lokality",
      href: "/leads",
      color: "bg-blue-50 border-blue-200",
      textColor: "text-blue-700",
    },
    {
      id: "3",
      title: "Efektivita kanálov",
      description:
        topSourceEntry
          ? `${topSourceEntry[0]} tvorí ${topSourcePct}% všetkých leadov (${topSourceEntry[1]} z ${leads.length}).`
          : "Pridávajte zdroje do leadov pre analýzu kanálov.",
      action: "Zobraziť matching",
      href: "/matching",
      color: "bg-purple-50 border-purple-200",
      textColor: "text-purple-700",
    },
    {
      id: "4",
      title: "Výkonnosť stavu klientov",
      description:
        ponukaLeads > 0
          ? `${ponukaLeads} leadov je vo fáze Ponuka. Priemerné AI skóre: ${avgScore}/100.`
          : `Priemerné AI skóre celej databázy: ${avgScore}/100.`,
      action: "Otvoriť stav klientov",
      href: "/pipeline",
      color: "bg-orange-50 border-orange-200",
      textColor: "text-orange-700",
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">AI insights</h2>
        <p className="text-sm text-gray-500">
          Inteligentné odporúčania pre lepšie výsledky.
        </p>
      </div>

      <div className="space-y-3">
        {insights.map((insight) => (
          <Link
            key={insight.id}
            href={insight.href}
            className={`block rounded-lg border p-4 hover:shadow-sm transition-shadow ${insight.color}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className={`font-medium ${insight.textColor} mb-1`}>
                  {insight.title}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  {insight.description}
                </p>
                <span className={`text-sm font-medium ${insight.textColor}`}>
                  {insight.action} →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}