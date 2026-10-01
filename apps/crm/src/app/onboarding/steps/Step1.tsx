"use client";
import { OUTCOME } from "@/lib/copy/outcome-copy";
import { useOnboarding } from "../useOnboarding";
import { PrimaryBtn, OptionCard } from "./shared";

export default function Step1({ slug }: { slug: string }) {
  const { formData, update, next, loaded, setPathMode, pathMode } = useOnboarding(slug);
  if (!loaded) return <div className="animate-pulse text-gray-400">Načítavam...</div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">— KROK 1 —</p>
      <h1 className="mb-3 text-4xl font-bold tracking-tight">Vitajte v Revolis</h1>
      <p className="mb-10 text-gray-500">
        {OUTCOME.heroSubhead}
      </p>

      <div className="mb-8 max-w-lg space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Ako chcete začať?</p>
        <button
          type="button"
          onClick={() => setPathMode("short")}
          className={
            "w-full rounded-xl border p-4 text-left transition-all " +
            (pathMode === "short"
              ? "border-2 border-gray-900 bg-gray-50"
              : "border-gray-200 hover:border-gray-400")
          }
        >
          <span className="block text-sm font-bold text-gray-900">Rýchly štart (4 kroky)</span>
          <span className="mt-1 block text-xs text-gray-500">
            Import → 60s prehľad → prvé priority. Bez zdĺhavého nastavovania.
          </span>
        </button>
        <button
          type="button"
          onClick={() => setPathMode("full")}
          className={
            "w-full rounded-xl border p-4 text-left transition-all " +
            (pathMode === "full"
              ? "border-2 border-gray-900 bg-gray-50"
              : "border-gray-200 hover:border-gray-400")
          }
        >
          <span className="block text-sm font-bold text-gray-900">Úplné nastavenie</span>
          <span className="mt-1 block text-xs text-gray-500">
            Profil, asistent, pipeline a ciele — keď chcete všetko naraz.
          </span>
        </button>
      </div>

      <div className="max-w-md space-y-6">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-gray-500">Tvoje meno *</label>
          <input
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none transition-all focus:ring-2 focus:ring-gray-900"
            value={formData.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Napr. Tomáš Novák"
          />
        </div>

        <div>
          <label className="mb-3 block text-xs font-semibold uppercase tracking-widest text-gray-500">Si v realitách ako...</label>
          <div className="grid grid-cols-3 gap-3">
            <OptionCard
              id="owner"
              emoji="🏛️"
              label="Majiteľ kancelárie"
              desc="Vediem agentúru / tím"
              active={formData.role === "owner"}
              onClick={(id) => update({ role: id })}
            />
            <OptionCard
              id="agent"
              emoji="💛"
              label="Samostatný maklér"
              desc="Pracujem sám alebo pre kanceláriu"
              active={formData.role === "agent"}
              onClick={(id) => update({ role: id })}
            />
            <OptionCard
              id="manager"
              emoji="⚙️"
              label="Office Manager"
              desc="Spravujem systémy a tím"
              active={formData.role === "manager"}
              onClick={(id) => update({ role: id })}
            />
          </div>
        </div>

        <div>
          <label className="mb-3 block text-xs font-semibold uppercase tracking-widest text-gray-500">
            Čo chcete dosiahnuť? (vyberte čo platí)
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "leads", emoji: "📈", label: "Viac uzavretých obchodov", desc: "Menej stratených leadov" },
              { id: "ai", emoji: "⏱️", label: "Vedieť, komu volať", desc: "Za 30 sekúnd ráno" },
              { id: "fast", emoji: "⚡", label: "Rýchlejšie uzatváranie", desc: "Skrátiť čas deal → zmluva" },
              { id: "analytics", emoji: "💰", label: "Kde ležia peniaze", desc: "Priority podľa hodnoty" },
              { id: "team", emoji: "👥", label: "Riadenie tímu", desc: "Prehľad nad celým tímom" },
              { id: "automation", emoji: "🔄", label: "Menej zabudnutých klientov", desc: "Follow-up bez chaosu" },
            ].map((opt) => (
              <OptionCard
                key={opt.id}
                id={opt.id}
                emoji={opt.emoji}
                label={opt.label}
                desc={opt.desc}
                active={formData.primaryGoal === opt.id}
                onClick={(id) => update({ primaryGoal: id })}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 max-w-md rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-gray-600">
        <strong>Sľub:</strong> {OUTCOME.barrierRemovers.join(" · ")}.
      </div>

      <div className="mt-8">
        <PrimaryBtn disabled={!formData.name || !formData.role} onClick={next}>
          {pathMode === "short" ? "Začať rýchly štart →" : "Začať nastavenie →"}
        </PrimaryBtn>
      </div>
    </div>
  );
}
