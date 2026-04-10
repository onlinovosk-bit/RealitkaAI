import Link from "next/link";
import { listProperties, type Property } from "@/lib/properties-store";
import { createClient } from "@/lib/supabase/server";
import type { PropertySearchParams, BuyerIntent, PropertyType } from "@/lib/buyer-intent";

// ── map buyer propertyType (EN) → SK type stored in properties table ──────────
const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  flat:       "Byt",
  house:      "Dom",
  land:       "Pozemok",
  commercial: "Komerčný priestor",
};

const DEAL_TYPE_LABEL: Record<string, string> = {
  buy:  "Kúpa",
  rent: "Prenájom",
  sell: "Predaj",
};

// ── try to fetch intent for personalization (soft fail) ───────────────────────
async function fetchIntent(intentId: string): Promise<BuyerIntent | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("buyer_intents")
      .select("*")
      .eq("id", intentId)
      .maybeSingle();

    if (!data) return null;

    return {
      id: data.id,
      leadId: data.lead_id,
      dealType: data.deal_type,
      propertyType: data.property_type,
      primaryCity: data.primary_city,
      budgetMin: data.budget_min,
      budgetMax: data.budget_max,
      timeHorizonMonths: data.time_horizon_months,
      newBuildOnly: data.new_build_only,
      needsMortgageHelp: data.needs_mortgage_help,
      rawFocusText: data.raw_focus_text,
      clientSegment: data.client_segment,
      buyerReadinessScore: data.buyer_readiness_score,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as BuyerIntent;
  } catch {
    return null;
  }
}

// ── property card ─────────────────────────────────────────────────────────────
function PropertyCard({ property, highlighted }: { property: Property; highlighted: boolean }) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${
      highlighted ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200"
    }`}>
      {highlighted && (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-white">
          ✦ Odporúčané pre vás
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-900">{property.title}</h3>
      <p className="mt-1 text-sm text-gray-500">{property.location}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600">{property.type}</span>
        <span className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600">{property.rooms}</span>
        {property.features.slice(0, 3).map(f => (
          <span key={f} className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600">{f}</span>
        ))}
      </div>

      <div className="mt-4 flex items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {property.price.toLocaleString("sk-SK")} €
          </p>
          <p className={`mt-0.5 text-xs font-medium ${
            property.status === "Aktívna" ? "text-emerald-600" :
            property.status === "Rezervovaná" ? "text-amber-600" : "text-gray-400"
          }`}>{property.status}</p>
        </div>
        <Link
          href={`/properties/${property.id}`}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          Detail →
        </Link>
      </div>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────
export default async function NehnutelnostiPage({
  searchParams,
}: {
  searchParams: Promise<PropertySearchParams & { [key: string]: string | undefined }>;
}) {
  const params = await searchParams;

  const dealType    = params.dealType;
  const propType    = params.property as PropertyType | undefined;
  const city        = params.city ?? "";
  const budgetMin   = params.budgetMin ? Number(params.budgetMin) : 0;
  const budgetMax   = params.budgetMax ? Number(params.budgetMax) : 0;
  const intentId    = params.intentId;

  // map buyer propertyType → properties table "type" field
  const typeFilter = propType ? PROPERTY_TYPE_LABEL[propType] : "";

  // fetch properties with base filters
  const properties = await listProperties({
    location: city,
    type: typeFilter,
    status: "Aktívna",
  });

  // budget filter (client-side since listProperties doesn't support price range yet)
  const filtered = properties.filter(p => {
    if (budgetMin > 0 && p.price < budgetMin) return false;
    if (budgetMax > 0 && p.price > budgetMax) return false;
    return true;
  });

  // fetch full intent for personalization (optional)
  const intent = intentId ? await fetchIntent(intentId) : null;

  // highlight properties that match intent (city + type + budget)
  function isHighlighted(p: Property): boolean {
    if (!intent) return false;
    const cityMatch = !intent.primaryCity || p.location.toLowerCase().includes(intent.primaryCity.toLowerCase());
    const typeMatch = !intent.propertyType || p.type === PROPERTY_TYPE_LABEL[intent.propertyType];
    const budgetMatch = intent.budgetMax === 0 || p.price <= intent.budgetMax;
    return cityMatch && typeMatch && budgetMatch;
  }

  // sort: highlighted first, then by price desc
  const sorted = [...filtered].sort((a, b) => {
    const aH = isHighlighted(a) ? 1 : 0;
    const bH = isHighlighted(b) ? 1 : 0;
    if (aH !== bH) return bH - aH;
    return b.price - a.price;
  });

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-5">
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nehnuteľnosti</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {sorted.length} ponúk{city ? ` · ${city}` : ""}
              {dealType ? ` · ${DEAL_TYPE_LABEL[dealType] ?? dealType}` : ""}
              {budgetMax > 0 ? ` · do ${budgetMax.toLocaleString("sk-SK")} €` : ""}
            </p>
          </div>
          <Link
            href="/buyer-onboarding"
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ← Zmeniť filtre
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Personalization banner */}
        {intent && (
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
              Prečo vám zobrazujeme tieto ponuky
            </p>
            <p className="text-sm text-gray-700">
              Hľadáte{" "}
              <strong>{PROPERTY_TYPE_LABEL[intent.propertyType] ?? intent.propertyType}</strong>
              {intent.primaryCity ? <> v <strong>{intent.primaryCity}</strong></> : null}
              {intent.budgetMax > 0 ? <> do <strong>{intent.budgetMax.toLocaleString("sk-SK")} €</strong></> : null}
              {intent.timeHorizonMonths === "0-3" ? " — urgentne" : ""}.
              {intent.rawFocusText ? (
                <> Váš popis: <em className="text-gray-500">„{intent.rawFocusText}"</em></>
              ) : null}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {intent.newBuildOnly && (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                  Novostavby
                </span>
              )}
              {intent.needsMortgageHelp && (
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                  Pomoc s hypotékou
                </span>
              )}
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                Skóre pripravenosti: {intent.buyerReadinessScore}/100
              </span>
            </div>
          </div>
        )}

        {/* Results */}
        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500">Nenašli sme žiadne nehnuteľnosti pre zadané kritériá.</p>
            <Link href="/buyer-onboarding" className="mt-4 inline-block text-sm font-medium text-gray-900 underline">
              Upraviť filtre
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map(p => (
              <PropertyCard key={p.id} property={p} highlighted={isHighlighted(p)} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
