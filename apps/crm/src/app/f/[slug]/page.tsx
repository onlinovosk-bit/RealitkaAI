import { getSmolkoInboundConfig } from "@/lib/leads/inbound-form-config";

export default async function PublicLeadFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ listing?: string; submitted?: string }>;
}) {
  const { slug: slugParam } = await params;
  const slug = String(slugParam ?? "").trim().toLowerCase();
  const query = await searchParams;
  const config = getSmolkoInboundConfig();

  if (!config) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Formulár nie je dostupný</h1>
          <p className="mt-2 text-sm text-slate-600">
            Chýba env <code className="text-xs">LEAD_FORM_TOKEN_SMOLKO</code> vo Vercel Production — doplňte hodnotu a redeploy.
          </p>
        </div>
      </main>
    );
  }

  if (slug !== config.slug) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Formulár nie je dostupný</h1>
          <p className="mt-2 text-sm text-slate-600">
            URL slug <code className="text-xs">{slug}</code> sa nezhoduje s env{" "}
            <code className="text-xs">LEAD_FORM_SLUG_SMOLKO</code> (server:{" "}
            <code className="text-xs">{config.slug}</code>). Nastavte slug na <code className="text-xs">smolko</code> alebo premennú zmažte.
          </p>
        </div>
      </main>
    );
  }

  const listing = String(query.listing ?? "").trim();
  const submitted = query.submitted === "1";

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-10">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Mám záujem o nehnuteľnosť</h1>
        <p className="mt-2 text-sm text-slate-600">
          Vyplňte kontakt — maklér sa vám ozve. Žiadny automatický email vám nepríde.
        </p>

        {submitted ? (
          <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Ďakujeme, váš záujem bol odoslaný.
          </p>
        ) : (
          <form action="/api/leads/inbound" method="post" className="mt-6 space-y-4">
            <input type="hidden" name="slug" value={config.slug} />
            <input type="hidden" name="token" value={config.expectedToken} />
            {listing ? <input type="hidden" name="listing" value={listing} /> : null}

            <div className="hidden" aria-hidden="true">
              <label htmlFor="hp">Nevypĺňajte</label>
              <input id="hp" name="hp" tabIndex={-1} autoComplete="off" />
            </div>

            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-800">
                Meno *
              </label>
              <input
                id="name"
                name="name"
                required
                maxLength={200}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-800">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                maxLength={254}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-800">
                Telefón
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                maxLength={50}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label htmlFor="note" className="mb-1 block text-sm font-medium text-slate-800">
                Správa
              </label>
              <textarea
                id="note"
                name="note"
                rows={3}
                maxLength={5000}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600"
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="consent"
                value="true"
                required
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />
              <span>
                Súhlasím so spracovaním údajov za účelom kontaktovania ohľadom nehnuteľnosti (GDPR).
              </span>
            </label>

            <button
              type="submit"
              className="w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Odoslať záujem
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
