import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { SMOLKO_AGENCY_ID } from "@/lib/profiles/resolve-profile-for-auth";
import {
  partitionPublicListings,
  publicListingTypeLabel,
} from "@/lib/public-listings-partition";
import type { PropertySearchParams, BuyerIntent, PropertyType } from "@/lib/buyer-intent";

// ── map buyer propertyType (EN) → SK type stored in properties table ──────────
const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  flat: "Byt",
  house: "Dom",
  land: "Pozemok",
  commercial: "Komerčný priestor",
};

const DEAL_TYPE_LABEL: Record<string, string> = {
  buy: "Kúpa",
  rent: "Prenájom",
  sell: "Predaj",
};

type PublicListing = {
  id: string;
  title: string;
  location: string;
  price: number;
  type: string;
  rooms: string;
  features: string[];
  status: string;
  transactionType: string | null;
};

/** Same agency resolution as buyer-onboarding/actions (T4 finding — env or Smolko default). */
function resolvePublicListingAgencyId(): string {
  return process.env.LEAD_FORM_AGENCY_ID_SMOLKO?.trim() || SMOLKO_AGENCY_ID;
}

/**
 * Public page has no session — must not use listProperties (session agency → empty set).
 * Admin client + explicit agency_id filter (tenant isolation without RLS reliance).
 */
async function listPublicAgencyListings(opts: {
  agencyId: string;
  city: string;
}): Promise<PublicListing[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("properties")
    .select(
      "id, title, location, price, type, rooms, features, status, transaction_type, created_at",
    )
    .eq("agency_id", opts.agencyId)
    .eq("status", "Aktívna")
    .order("created_at", { ascending: false })
    .limit(500);

  if (opts.city.trim()) {
    query = query.ilike("location", `%${opts.city.trim()}%`);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error("[nehnutelnosti] public listings", error?.message);
    return [];
  }

  return data.map((row) => ({
    id: String(row.id),
    title: String(row.title ?? ""),
    location: String(row.location ?? ""),
    price: Number(row.price ?? 0),
    type: String(row.type ?? ""),
    rooms: String(row.rooms ?? ""),
    features: Array.isArray(row.features) ? (row.features as string[]) : [],
    status: String(row.status ?? ""),
    transactionType: row.transaction_type != null ? String(row.transaction_type) : null,
  }));
}

// ── try to fetch intent for personalization (soft fail) ───────────────────────
async function fetchIntent(intentId: string): Promise<BuyerIntent | null> {
  try {
    const supabase = createAdminClient();
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
function PropertyCard({
  property,
  highlighted,
}: {
  property: PublicListing;
  highlighted: boolean;
}) {
  const typeLabel = publicListingTypeLabel(property.type);
  const roomsLabel = property.rooms.trim();

  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${
        highlighted ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200"
      }`}
    >
      {highlighted && (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-white">
          ✦ Odporúčané pre vás
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-900">{property.title}</h3>
      <p className="mt-1 text-sm text-gray-500">{property.location}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600">
          {typeLabel}
        </span>
        {roomsLabel ? (
          <span className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600">
            {roomsLabel}
          </span>
        ) : null}
        {property.features.slice(0, 3).map((f) => (
          <span
            key={f}
            className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600"
          >
            {f}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {property.price.toLocaleString("sk-SK")} €
          </p>
          <p
            className={`mt-0.5 text-xs font-medium ${
              property.status === "Aktívna"
                ? "text-emerald-600"
                : property.status === "Rezervovaná"
                  ? "text-amber-600"
                  : "text-gray-400"
            }`}
          >
            {property.status}
          </p>
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

  const dealType = params.dealType;
  const propType = params.property as PropertyType | undefined;
  const city = params.city ?? "";
  const budgetMin = params.budgetMin ? Number(params.budgetMin) : 0;
  const budgetMax = params.budgetMax ? Number(params.budgetMax) : 0;
  const intentId = params.intentId;

  const typeFilter = propType ? PROPERTY_TYPE_LABEL[propType] : "";
  const agencyId = resolvePublicListingAgencyId();

  const listings = await listPublicAgencyListings({ agencyId, city });
  const { matched, unknown } = partitionPublicListings(listings, {
    typeFilter,
    budgetMin,
    budgetMax,
  });

  const intent = intentId ? await fetchIntent(intentId) : null;

  function isHighlighted(p: PublicListing): boolean {
    if (!intent) return false;
    const cityMatch =
      !intent.primaryCity ||
      p.location.toLowerCase().includes(intent.primaryCity.toLowerCase());
    const typeMatch =
      !intent.propertyType || p.type === PROPERTY_TYPE_LABEL[intent.propertyType];
    const budgetMatch = intent.budgetMax === 0 || p.price <= intent.budgetMax;
    return cityMatch && typeMatch && budgetMatch;
  }

  const sortedMatched = [...matched].sort((a, b) => {
    const aH = isHighlighted(a) ? 1 : 0;
    const bH = isHighlighted(b) ? 1 : 0;
    if (aH !== bH) return bH - aH;
    return b.price - a.price;
  });

  const sortedUnknown = [...unknown].sort((a, b) => b.price - a.price);
  const totalShown = sortedMatched.length + sortedUnknown.length;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-5">
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nehnuteľnosti</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {totalShown} ponúk{city ? ` · ${city}` : ""}
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
        {intent && (
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
              Prečo vám zobrazujeme tieto ponuky
            </p>
            <p className="text-sm text-gray-700">
              Hľadáte{" "}
              <strong>{PROPERTY_TYPE_LABEL[intent.propertyType] ?? intent.propertyType}</strong>
              {intent.primaryCity ? (
                <>
                  {" "}
                  v <strong>{intent.primaryCity}</strong>
                </>
              ) : null}
              {intent.budgetMax > 0 ? (
                <>
                  {" "}
                  do <strong>{intent.budgetMax.toLocaleString("sk-SK")} €</strong>
                </>
              ) : null}
              {intent.timeHorizonMonths === "0-3" ? " — urgentne" : ""}.
              {intent.rawFocusText ? (
                <>
                  {" "}
                  Váš popis: <em className="text-gray-500">„{intent.rawFocusText}"</em>
                </>
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

        {sortedMatched.length === 0 && sortedUnknown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500">Nenašli sme žiadne nehnuteľnosti pre zadané kritériá.</p>
            <Link
              href="/buyer-onboarding"
              className="mt-4 inline-block text-sm font-medium text-gray-900 underline"
            >
              Upraviť filtre
            </Link>
          </div>
        ) : (
          <>
            {sortedMatched.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {sortedMatched.map((p) => (
                  <PropertyCard key={p.id} property={p} highlighted={isHighlighted(p)} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center mb-8">
                <p className="text-gray-500">
                  Žiadna presná zhoda pre zadaný typ. Nižšie sú nezaradené ponuky.
                </p>
              </div>
            )}

            {sortedUnknown.length > 0 ? (
              <section className="mt-10">
                <h2 className="text-lg font-semibold text-gray-900">
                  Ďalšie nehnuteľnosti, ktoré sme zatiaľ nezaradili
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Typ alebo druh transakcie ešte nie je potvrdený — nezahadzujeme ich z výpisu.
                </p>
                <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {sortedUnknown.map((p) => (
                    <PropertyCard key={p.id} property={p} highlighted={false} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
