import Link from "next/link";
import type { LeadPropertyMatchPerformanceSummary } from "@/lib/matching-store";

function PerformanceTable({
  title,
  description,
  items,
  filterKey,
}: {
  title: string;
  description: string;
  items: LeadPropertyMatchPerformanceSummary["byAgent"];
  filterKey: "agent" | "team";
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">{description}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-gray-500">
            <tr className="border-b border-gray-200">
              <th className="pb-3 font-medium">Meno</th>
              <th className="pb-3 font-medium">Matchy</th>
              <th className="pb-3 font-medium">Záujem</th>
              <th className="pb-3 font-medium">Konverzia</th>
              <th className="pb-3 font-medium">Priemerné skóre</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.slice(0, 6).map((item) => (
              <tr key={item.id}>
                <td className="py-3 pr-4 font-medium text-gray-900">
                  <Link
                    href={`/matching?${filterKey}=${encodeURIComponent(item.id)}`}
                    className="hover:text-gray-700 hover:underline"
                  >
                    {item.label}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-gray-600">{item.total}</td>
                <td className="py-3 pr-4 text-gray-600">{item.interested}</td>
                <td className="py-3 pr-4 text-gray-600">{item.conversionRate} %</td>
                <td className="py-3 text-gray-600">{item.avgScore}</td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-sm text-gray-500">
                  Zatiaľ nie sú dostupné žiadne matching dáta.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MatchingPerformanceBreakdown({
  summary,
}: {
  summary: LeadPropertyMatchPerformanceSummary;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <PerformanceTable
        title="Matching podľa agenta"
        description="Kto premieňa odporúčané ponuky na reálny záujem leadov."
        items={summary.byAgent}
        filterKey="agent"
      />
      <PerformanceTable
        title="Matching podľa tímu"
        description="Porovnanie výkonnosti tímov podľa uložených matchingov."
        items={summary.byTeam}
        filterKey="team"
      />
    </div>
  );
}