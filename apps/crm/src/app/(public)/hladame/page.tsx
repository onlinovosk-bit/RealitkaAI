import { createAdminClient } from "@/lib/supabase/server";
import { SMOLKO_AGENCY_ID } from "@/lib/profiles/resolve-profile-for-auth";
import { getSmolkoInboundConfig } from "@/lib/leads/inbound-form-config";
import { REALVIA_TRANSACTION_DEMAND } from "@/lib/realvia/map-taxonomy";

function resolvePublicListingAgencyId(): string | null {
  const id = process.env.LEAD_FORM_AGENCY_ID_SMOLKO?.trim() || SMOLKO_AGENCY_ID;
  return id || null;
}

type DemandRow = {
  id: string;
  title: string;
  type: string;
  price: number;
};

async function listDemandAds(agencyId: string): Promise<DemandRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("properties")
    .select("id, title, type, price, transaction_type, created_at")
    .eq("agency_id", agencyId)
    .eq("transaction_type", REALVIA_TRANSACTION_DEMAND)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) {
    console.error("[hladame] listDemandAds", error?.message);
    return [];
  }

  return data.map((row) => ({
    id: String(row.id),
    title: String(row.title ?? ""),
    type: String(row.type ?? ""),
    price: Number(row.price ?? 0),
  }));
}

function formatBudget(price: number): string | null {
  if (!(price > 0)) return null;
  return `do ${price.toLocaleString("sk-SK")} €`;
}

export default async function HladamePage({
  searchParams,
}: {
  searchParams: Promise<{ dopyt?: string; submitted?: string }>;
}) {
  const query = await searchParams;
  const agencyId = resolvePublicListingAgencyId();
  const config = getSmolkoInboundConfig();

  // Fail closed without agency scope — never show cross-tenant demand.
  const demands = agencyId ? await listDemandAds(agencyId) : [];

  const activeDopyt = String(query.dopyt ?? "").trim();
  const active = activeDopyt
    ? demands.find((d) => d.id === activeDopyt) ?? null
    : null;
  const submitted = query.submitted === "1";

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-gray-900">Máme kupca</h1>
          <p className="mt-2 text-sm text-gray-600">
            Hľadáme konkrétne nehnuteľnosti pre klientov. Ak máte takúto ponuku,
            ozvite sa — maklér sa vám ozve.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8 space-y-4">
        {!agencyId ? (
          <p className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
            Ponuky momentálne nie sú dostupné.
          </p>
        ) : demands.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
            Momentálne nemáme otvorený dopyt.
          </p>
        ) : (
          demands.map((d) => {
            const budget = formatBudget(d.price);
            return (
              <article
                key={d.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Hľadáme · {d.type || "nehnuteľnosť"}
                  {budget ? ` · ${budget}` : ""}
                </p>
                <h2 className="mt-2 text-lg font-semibold text-gray-900">{d.title}</h2>
                <div className="mt-4">
                  <a
                    href={`/hladame?dopyt=${encodeURIComponent(d.id)}`}
                    className="inline-flex rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
                  >
                    Mám takúto nehnuteľnosť
                  </a>
                </div>
              </article>
            );
          })
        )}

        {active && config ? (
          <section className="mt-8 rounded-2xl border border-gray-900 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Kontaktujte nás</h2>
            <p className="mt-1 text-sm text-gray-600">
              Reagujete na: <strong>{active.title}</strong>
            </p>

            {submitted ? (
              <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                Ďakujeme, váš záujem bol odoslaný. Maklér sa vám ozve.
              </p>
            ) : (
              <form action="/api/leads/inbound" method="post" className="mt-6 space-y-4">
                <input type="hidden" name="slug" value={config.slug} />
                <input type="hidden" name="token" value={config.expectedToken} />
                <input type="hidden" name="note" value={`dopyt=${active.id}`} />
                <input type="hidden" name="listing" value={active.id} />

                <div className="hidden" aria-hidden="true">
                  <label htmlFor="hp">Nevypĺňajte</label>
                  <input id="hp" name="hp" tabIndex={-1} autoComplete="off" />
                </div>

                <div>
                  <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-800">
                    Meno *
                  </label>
                  <input
                    id="name"
                    name="name"
                    required
                    maxLength={200}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-600"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-800">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    maxLength={254}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-600"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-800">
                    Telefón
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    maxLength={50}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-600"
                  />
                </div>

                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="consent"
                    value="true"
                    required
                    className="mt-1 h-4 w-4 rounded border-gray-300"
                  />
                  <span>
                    Súhlasím so spracovaním údajov za účelom kontaktovania ohľadom
                    nehnuteľnosti (GDPR).
                  </span>
                </label>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Odoslať
                </button>
              </form>
            )}
          </section>
        ) : null}

        {active && !config ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Formulár nie je nakonfigurovaný (chýba LEAD_FORM_TOKEN_SMOLKO).
          </p>
        ) : null}
      </div>
    </main>
  );
}
