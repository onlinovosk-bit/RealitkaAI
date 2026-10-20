"use client";

import { useCallback, useState } from "react";

/**
 * MORNING-BRIEF-UI-01 — miesto, kde si maklér ranný prehľad zapne.
 *
 * Bez riadku v `morning_brief_settings` cron nikomu nepošle nič
 * (`/api/cron/morning-brief`, route.ts:49). Na PROD bola tá tabuľka prázdna,
 * takže prehľad 14 dní po sebe „bežal" a nikomu nedošiel.
 */

export type BriefSettings = {
  enabled: boolean;
  deliveryHourUtc: number;
  deliveryMinuteUtc: number;
  leadCount: number;
  includeLvChanges: boolean;
  includeArbitrage: boolean;
  includePriceDrops: boolean;
  includeTeamStats: boolean;
  channels: string[];
  abVariant: "A" | "B";
};

/** Predvolené hodnoty sú tie isté ako DEFAULT v migrácii. */
export const BRIEF_DEFAULTS: BriefSettings = {
  enabled: true,
  deliveryHourUtc: 6,
  deliveryMinuteUtc: 0,
  leadCount: 3,
  includeLvChanges: true,
  includeArbitrage: true,
  includePriceDrops: true,
  includeTeamStats: false,
  channels: ["email"],
  abVariant: "A",
};

/**
 * UTC → miestny čas len na zobrazenie. V DB je čas v UTC zámerne (cron beží
 * v UTC); keby sme ukladali miestny, posunul by sa po zmene času.
 */
function localLabel(hourUtc: number, minuteUtc: number): string {
  const d = new Date(Date.UTC(2026, 0, 1, hourUtc, minuteUtc));
  return d.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" });
}

export default function MorningBriefSettingsPanel({
  initial,
  neverConfigured,
}: {
  initial: BriefSettings;
  /** true = profil ešte nemá riadok; „nenastavené" nie je to isté ako „vypnuté". */
  neverConfigured: boolean;
}) {
  const [s, setS] = useState<BriefSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof BriefSettings>(k: K, v: BriefSettings[K]) => {
    setS((prev) => ({ ...prev, [k]: v }));
    setSaved(false);
  };

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/morning-brief/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      if (!res.ok) {
        setError("Uloženie zlyhalo. Skús to znova.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Uloženie zlyhalo. Skús to znova.");
    } finally {
      setSaving(false);
    }
  }, [s]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      {neverConfigured && (
        <p className="mb-5 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Ranný prehľad zatiaľ nemáš nastavený, takže ti nechodí. Ulož nastavenie
          nižšie a začne chodiť od najbližšieho rána.
        </p>
      )}

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={s.enabled}
          onChange={(e) => set("enabled", e.target.checked)}
          className="h-4 w-4"
        />
        <span className="font-medium text-gray-900">Posielať mi ranný prehľad</span>
      </label>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="brief-hour" className="block text-sm font-medium text-gray-700">
            Hodina doručenia (UTC)
          </label>
          <input
            id="brief-hour"
            type="number"
            min={0}
            max={23}
            value={s.deliveryHourUtc}
            onChange={(e) => set("deliveryHourUtc", Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-500">
            U teba to vyjde na {localLabel(s.deliveryHourUtc, s.deliveryMinuteUtc)}.
          </p>
        </div>

        <div>
          <label htmlFor="brief-minute" className="block text-sm font-medium text-gray-700">
            Minúta
          </label>
          <input
            id="brief-minute"
            type="number"
            min={0}
            max={59}
            value={s.deliveryMinuteUtc}
            onChange={(e) => set("deliveryMinuteUtc", Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="brief-leads" className="block text-sm font-medium text-gray-700">
            Koľko leadov v prehľade (1–10)
          </label>
          <input
            id="brief-leads"
            type="number"
            min={1}
            max={10}
            value={s.leadCount}
            onChange={(e) => set("leadCount", Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="brief-variant" className="block text-sm font-medium text-gray-700">
            Dĺžka
          </label>
          <select
            id="brief-variant"
            value={s.abVariant}
            onChange={(e) => set("abVariant", e.target.value as "A" | "B")}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="A">Krátko — tri vety</option>
            <option value="B">Podrobne — s kontextom</option>
          </select>
        </div>
      </div>

      <fieldset className="mt-6">
        <legend className="text-sm font-medium text-gray-700">Čo zahrnúť</legend>
        <div className="mt-2 space-y-2">
          {([
            ["includeLvChanges", "Zmeny na listoch vlastníctva"],
            ["includeArbitrage", "Cenové príležitosti"],
            ["includePriceDrops", "Zníženia cien"],
            ["includeTeamStats", "Výsledky tímu"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={s[key]}
                onChange={(e) => set(key, e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm text-gray-800">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Ukladám…" : "Uložiť"}
        </button>
        {saved && <span className="text-sm text-green-700">Uložené.</span>}
        {error && <span className="text-sm text-red-700">{error}</span>}
      </div>
    </div>
  );
}
