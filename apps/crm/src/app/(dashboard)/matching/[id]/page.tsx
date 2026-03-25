import Link from "next/link";
import { notFound } from "next/navigation";
import { listLeads } from "@/lib/leads-store";
import { getProperty as getPropertyById } from "@/lib/properties-store";
import LogMatchButton from "@/components/matching/log-match-button";
import { calculatePropertyMatch } from "@/lib/matching";

function formatPrice(price: number) {
  return new Intl.NumberFormat("sk-SK").format(price);
}

export default async function MatchingPropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await getPropertyById(id);

  if (!property) {
    notFound();
  }

  const leads = await listLeads();
  const matchedLeads = leads
    .map((lead) => ({
      lead,
      score: calculatePropertyMatch(lead, property).score,
    }))
    .filter((item) => item.score >= 40)
    .sort((a, b) => b.score - a.score);

  return (
    <main className="p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link href="/matching" className="text-sm font-medium text-gray-500 hover:text-gray-900">
            ← Späť na matching
          </Link>
        </div>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{property.title}</h1>
              <p className="mt-2 text-gray-500">{property.location} • {property.type} • {property.rooms}</p>
            </div>
            <div className="rounded-2xl bg-gray-900 px-5 py-3 text-white">
              <div className="text-sm opacity-80">Cena</div>
              <div className="text-2xl font-semibold">{formatPrice(property.price)} €</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">Stav: {property.status}</span>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Odporučení klienti</h2>
              <p className="mt-1 text-sm text-gray-500">Leady, pre ktoré táto nehnuteľnosť najlepšie sedí.</p>
            </div>
            <div className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
              {matchedLeads.length} matchov
            </div>
          </div>

          <div className="space-y-4">
            {matchedLeads.map(({ lead, score }) => (
              <div key={lead.id} className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-lg font-semibold text-gray-900">{lead.name}</div>
                  <div className="mt-1 text-sm text-gray-500">{lead.location} • {lead.propertyType} • {lead.rooms} • rozpočet {lead.budget}</div>
                  <div className="mt-2 text-sm text-gray-600">Maklér: {lead.assignedAgent || "Nepriradený"}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-gray-900 px-3 py-1 text-sm font-semibold text-white">Match {score}</span>
                  <Link href={`/leads/${lead.id}`} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white">
                    Otvoriť lead
                  </Link>
                  <LogMatchButton leadId={lead.id} propertyId={property.id} />
                </div>
              </div>
            ))}

            {matchedLeads.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600">
                Zatiaľ sme nenašli vhodného klienta. Skús doplniť nové leady alebo rozšíriť matching pravidlá.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}