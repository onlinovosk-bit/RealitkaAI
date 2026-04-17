"use client";
import RevolisNavSpriteIcon, { REVOLIS_NAV_SPRITE } from "@/components/onboarding/RevolisNavSpriteIcon";
import { useOnboarding } from "../useOnboarding";
import { PrimaryBtn, SecondaryBtn, Toggle } from "./shared";

/** Rovnaké id ako predtým (localStorage); ikony z oficiálnej mriežky Revolis. */
const TONE_OPTIONS: { id: string; spriteIndex: number; short: string }[] = [
  { id: "💼 PROFESIONÁLNY", spriteIndex: REVOLIS_NAV_SPRITE.prehlad, short: "PROFESIONÁLNY" },
  { id: "😊 PRIATEĽSKÝ", spriteIndex: REVOLIS_NAV_SPRITE.zaujemcovia, short: "PRIATEĽSKÝ" },
  { id: "✨ LUXUSNÝ", spriteIndex: REVOLIS_NAV_SPRITE.mojePonuky, short: "LUXUSNÝ" },
  { id: "⚡ ENERGICKÝ", spriteIndex: REVOLIS_NAV_SPRITE.ulohy, short: "ENERGICKÝ" },
  { id: "🎩 FORMÁLNY", spriteIndex: REVOLIS_NAV_SPRITE.stavKlientov, short: "FORMÁLNY" },
];

export default function Step4({ slug }: { slug: string }) {
  const { formData, update, next, back, loaded } = useOnboarding(slug);
  if (!loaded) return <div className="animate-pulse text-gray-400">Načítavam...</div>;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">— KROK 4 ZO 8 — KĽÚČOVÝ KROK</p>
      <h1 className="text-3xl font-bold mb-2 text-gray-900 flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 p-1">
          <RevolisNavSpriteIcon index={REVOLIS_NAV_SPRITE.nastavenia} size={36} title="Nastavenia" />
        </span>
        Nakonfiguruj AI asistenta
      </h1>
      <p className="text-gray-500 mb-8">Toto je srdce Revolisu. Tvoj AI obchodník bude pracovať za teba non-stop.</p>

      <p className="text-sm text-gray-700 mb-6 rounded-xl border border-cyan-100 bg-cyan-50/40 px-4 py-3 leading-relaxed">
        Podľa interných meraní vie AI pokryť väčšinu opakovateľnej práce — odpovede na nové dopyty, hodnotenie záujemcov (skóre), párovanie nehnuteľností a
        plánované následné kontakty. Na tebe ostáva ľudský kontakt pri obhliadkach, vyjednávaní a dlhodobých vzťahoch.
      </p>

      <div className="space-y-6 max-w-lg">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">Meno tvojho AI asistenta</label>
          <input
            className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-900 text-base transition-all"
            value={formData.aiName}
            onChange={(e) => update({ aiName: e.target.value })}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-3">Tón komunikácie AI</label>
          <div className="flex flex-wrap gap-2">
            {TONE_OPTIONS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => update({ aiTone: t.id })}
                className={
                  "border rounded-xl px-4 py-2.5 text-xs font-semibold flex flex-col items-center gap-1.5 min-w-[80px] transition-all " +
                  (formData.aiTone === t.id
                    ? "border-2 border-gray-900 bg-gray-50 text-gray-900"
                    : "border-gray-200 text-gray-500 hover:border-gray-400")
                }
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 p-0.5">
                  <RevolisNavSpriteIcon index={t.spriteIndex} size={32} />
                </span>
                <span>{t.short}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">Primárny jazyk</label>
            <select className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none">
              <option>sk Slovenčina</option>
              <option>cs Čeština</option>
              <option>en Angličtina</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-2">Oneskorenie auto-odpovede</label>
            <select className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none">
              <option>5 minút (odporúčané)</option>
              <option>Okamžite</option>
              <option>15 minút</option>
              <option>30 minút</option>
            </select>
          </div>
        </div>

        <div className="border border-gray-100 rounded-xl divide-y divide-gray-100">
          {(
            [
              {
                key: "autoReply",
                spriteIndex: REVOLIS_NAV_SPRITE.nastavenia,
                label: "Automatické odpovedanie",
                desc: "AI odpovedá automaticky bez tvojho zásahu.",
              },
              {
                key: "workHours",
                spriteIndex: REVOLIS_NAV_SPRITE.ulohy,
                label: "Pracovné hodiny",
                desc: "AI odpovedá len 8:00–18:00.",
              },
              {
                key: "leadScoring",
                spriteIndex: REVOLIS_NAV_SPRITE.zaujemcovia,
                label: "Inteligentné hodnotenie záujemcov",
                desc: "AI hodnotí záujemcov a upozorní na najvyššie priority.",
              },
            ] as const
          ).map((item) => (
            <div key={item.key} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 p-0.5">
                  <RevolisNavSpriteIcon index={item.spriteIndex} size={32} />
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-900">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                </div>
              </div>
              <Toggle
                value={(formData as Record<string, unknown>)[item.key] as boolean}
                onChange={(v) => update({ [item.key]: v })}
              />
            </div>
          ))}
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 p-0.5">
              <RevolisNavSpriteIcon index={REVOLIS_NAV_SPRITE.ucet} size={34} title="Účet" />
            </span>
            <div>
              <div className="text-sm font-semibold text-gray-900">{formData.aiName}</div>
              <div className="text-xs text-green-600">● Online — odpovedá za 5 min</div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700">
            Dobrý deň! Som {formData.aiName}, digitálny asistent. Rád vám pomôžem nájsť nehnuteľnosť. Čo práve hľadáte?
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-sm text-gray-600 flex gap-2.5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100/90 p-0.5 ring-1 ring-amber-200/80">
            <RevolisNavSpriteIcon index={REVOLIS_NAV_SPRITE.prehlad} size={32} title="Prehľad" />
          </span>
          <span>
            <strong>Výsledok maklérov s Revolis AI:</strong> Priemerná odpoveď do 2 min (oproti 4 h pri manuálnej práci). Miera konverzie vyššia o približne
            34 %.
          </span>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <SecondaryBtn onClick={back}>← Späť</SecondaryBtn>
        <PrimaryBtn onClick={next}>Generovať AI & pokračovať →</PrimaryBtn>
      </div>
    </div>
  );
}
