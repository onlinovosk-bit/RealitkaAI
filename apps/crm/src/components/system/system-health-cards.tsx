import EmptyState from "@/components/shared/empty-state";
import SectionHeader from "@/components/shared/section-header";

type EnvCheck = {
  key: string;
  label: string;
  required: boolean;
  present: boolean;
};

export default function SystemHealthCards({
  checks,
  mode,
}: {
  checks: EnvCheck[];
  mode: string;
}) {
  if (checks.length === 0) {
    return (
      <EmptyState
        title="Nie sú dostupné systémové kontroly"
        description="Skontroluj inicializáciu diagnostiky prostredia."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <SectionHeader
          title="Režim systému"
          description="Rýchla diagnostika prostredia a kritických nastavení."
        />

        <div className="inline-flex rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800">
          {mode === "connected" ? "DB / externé služby pripojené" : "Fallback / demo režim"}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {checks.map((check) => (
          <div
            key={check.key}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">{check.label}</p>
                <p className="mt-1 text-sm text-gray-700">{check.key}</p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  check.present
                    ? "bg-green-100 text-green-700"
                    : check.required
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {check.present ? "OK" : check.required ? "Chýba" : "Voliteľné"}
              </span>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              {check.required
                ? "Povinné pre plný režim aplikácie."
                : "Voliteľné, ale môže rozšíriť funkcie systému."}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
