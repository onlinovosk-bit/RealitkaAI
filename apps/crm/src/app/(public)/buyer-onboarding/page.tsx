import { submitBuyerOnboarding } from "./actions";

const DEAL_TYPES = [
  { value: "buy",  label: "Kúpa" },
  { value: "rent", label: "Prenájom" },
  { value: "sell", label: "Predaj" },
];

const PROPERTY_TYPES = [
  { value: "flat",       label: "Byt" },
  { value: "house",      label: "Dom" },
  { value: "land",       label: "Pozemok" },
  { value: "commercial", label: "Komerčný priestor" },
];

const TIME_HORIZONS = [
  { value: "0-3",  label: "Ihneď / do 3 mesiacov" },
  { value: "3-6",  label: "3 – 6 mesiacov" },
  { value: "6-12", label: "6 – 12 mesiacov" },
  { value: "12+",  label: "12+ mesiacov" },
];

export default async function BuyerOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Nájdite svoju nehnuteľnosť</h1>
          <p className="mt-2 text-gray-500">
            Vyplňte pár otázok a my vám ukážeme najlepšie ponuky.
          </p>
        </div>

        {params.error === "missing_fields" && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Vyplňte meno a email.
          </div>
        )}

        <form
          action={submitBuyerOnboarding}
          className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm space-y-6"
        >
          {/* Contact */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold uppercase tracking-widest text-gray-400">
              Kontakt
            </legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Meno <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  required
                  placeholder="Ján Novák"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="jan@email.sk"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-500"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Telefón</label>
              <input
                name="phone"
                type="tel"
                placeholder="+421 9XX XXX XXX"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-500"
              />
            </div>
          </fieldset>

          {/* Intent */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold uppercase tracking-widest text-gray-400">
              Čo hľadáte?
            </legend>

            <div className="grid grid-cols-3 gap-2">
              {DEAL_TYPES.map(dt => (
                <label key={dt.value} className="cursor-pointer">
                  <input type="radio" name="dealType" value={dt.value}
                    defaultChecked={dt.value === "buy"} className="peer sr-only" />
                  <span className="block rounded-xl border border-gray-200 px-3 py-2.5 text-center text-sm font-medium
                    peer-checked:border-gray-900 peer-checked:bg-gray-900 peer-checked:text-white
                    hover:border-gray-400 transition-colors">
                    {dt.label}
                  </span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PROPERTY_TYPES.map(pt => (
                <label key={pt.value} className="cursor-pointer">
                  <input type="radio" name="propertyType" value={pt.value}
                    defaultChecked={pt.value === "flat"} className="peer sr-only" />
                  <span className="block rounded-xl border border-gray-200 px-3 py-2.5 text-center text-sm font-medium
                    peer-checked:border-gray-900 peer-checked:bg-gray-900 peer-checked:text-white
                    hover:border-gray-400 transition-colors">
                    {pt.label}
                  </span>
                </label>
              ))}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Mesto / lokalita</label>
              <input
                name="primaryCity"
                placeholder="napr. Bratislava, Košice, Prešov…"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-500"
              />
            </div>
          </fieldset>

          {/* Budget */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold uppercase tracking-widest text-gray-400">
              Rozpočet (€)
            </legend>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Od (€)</label>
                <input
                  name="budgetMin"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="napr. 400"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Do (€)</label>
                <input
                  name="budgetMax"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="napr. 800 alebo 250 000"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-500"
                />
              </div>
            </div>
          </fieldset>

          {/* Timeline */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold uppercase tracking-widest text-gray-400">
              Kedy plánujete kúpu?
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {TIME_HORIZONS.map(th => (
                <label key={th.value} className="cursor-pointer">
                  <input type="radio" name="timeHorizonMonths" value={th.value}
                    defaultChecked={th.value === "3-6"} className="peer sr-only" />
                  <span className="block rounded-xl border border-gray-200 px-3 py-2.5 text-center text-sm font-medium
                    peer-checked:border-gray-900 peer-checked:bg-gray-900 peer-checked:text-white
                    hover:border-gray-400 transition-colors">
                    {th.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Flags */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold uppercase tracking-widest text-gray-400">
              Doplnkové info
            </legend>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="newBuildOnly"
                className="h-4 w-4 rounded border-gray-300 accent-gray-900" />
              <span className="text-sm text-gray-700">Zaujímam sa len o novostavby</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="needsMortgageHelp"
                className="h-4 w-4 rounded border-gray-300 accent-gray-900" />
              <span className="text-sm text-gray-700">Potrebujem pomoc s hypotékou</span>
            </label>
          </fieldset>

          {/* Free text focus */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Popíšte čo hľadáte <span className="text-gray-400 font-normal">(voliteľné)</span>
            </label>
            <textarea
              name="rawFocusText"
              rows={3}
              placeholder="napr. 3-izbák v Prešove do 150k, novostavba, tiché okolie, blízko školy…"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-gray-900 px-4 py-3.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            Zobraziť nehnuteľnosti →
          </button>
        </form>
      </div>
    </main>
  );
}
