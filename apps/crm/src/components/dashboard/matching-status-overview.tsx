import Link from "next/link";
import type { LeadPropertyMatchSummary } from "@/lib/matching-store";

function StatusCard({
  title,
  value,
  subtitle,
  classes,
  href,
}: {
  title: string;
  value: number;
  subtitle: string;
  classes: string;
  href: string;
}) {
  return (
    <Link href={href} className={`block rounded-2xl border p-4 transition hover:opacity-90 ${classes}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-2 text-sm opacity-80">{subtitle}</p>
    </Link>
  );
}

export default function MatchingStatusOverview({
  summary,
}: {
  summary: LeadPropertyMatchSummary;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Matching statusy</h2>
          <p className="text-sm text-gray-500">
            Prehľad, ako reagujú leady na odporúčané nehnuteľnosti.
          </p>
        </div>

        <Link
          href="/matching"
          className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Otvoriť matching
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatusCard
          title="Odoslané"
          value={summary.sent}
          subtitle="Nové ponuky čakajú na reakciu"
          classes="border-gray-200 bg-gray-50 text-gray-800"
          href="/matching?status=sent"
        />
        <StatusCard
          title="Prezreté"
          value={summary.viewed}
          subtitle="Lead si ponuku otvoril"
          classes="border-blue-200 bg-blue-50 text-blue-800"
          href="/matching?status=viewed"
        />
        <StatusCard
          title="Záujem"
          value={summary.interested}
          subtitle="Silné signály na follow-up"
          classes="border-green-200 bg-green-50 text-green-800"
          href="/matching?status=interested"
        />
        <StatusCard
          title="Odmietnuté"
          value={summary.rejected}
          subtitle="Potrebná nová alternatíva"
          classes="border-red-200 bg-red-50 text-red-800"
          href="/matching?status=rejected"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-500">Všetky uložené matchy</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-500">Priemerné matching skóre</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.avgScore}</p>
        </div>
      </div>
    </div>
  );
}