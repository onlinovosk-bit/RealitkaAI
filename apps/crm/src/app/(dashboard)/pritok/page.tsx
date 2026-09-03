import ModuleShell from "@/components/shared/module-shell";
import ErrorState from "@/components/shared/error-state";
import { createClient } from "@/lib/supabase/server";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";
import {
  filterLeadsInWindow,
  groupInflowBySource,
  inflowCutoffIso,
  INFLOW_EMPTY_COPY,
  INFLOW_WINDOW_DAYS,
} from "./inflow";

export const dynamic = "force-dynamic";

export default async function PritokPage() {
  const supabase = await createClient();
  const cutoffIso = inflowCutoffIso();

  const { data, error } = await supabase
    .from("leads")
    .select("id, source, created_at")
    .gte("created_at", cutoffIso);

  if (error) {
    return (
      <ModuleShell
        title="Prítok"
        description="Odkiaľ chodia leady — posledných 30 dní, z vášho CRM."
      >
        <ErrorState
          title="Prítok sa nepodarilo načítať"
          description="Skúste obnoviť stránku. Čísla sa berú z leadov vašej kancelárie."
        />
      </ModuleShell>
    );
  }

  const grouped = groupInflowBySource(filterLeadsInWindow(data ?? [], cutoffIso));
  const total = grouped.reduce((sum, row) => sum + row.count, 0);

  return (
    <ModuleShell
      title="Prítok"
      description={`Odkiaľ chodia leady — posledných ${INFLOW_WINDOW_DAYS} dní.`}
    >
      {grouped.length === 0 || total === 0 ? (
        <p className="text-sm" style={{ color: SLATE_HORIZON.muted }} data-testid="pritok-empty">
          {INFLOW_EMPTY_COPY}
        </p>
      ) : (
        <ul className="space-y-2" data-testid="pritok-sources">
          {grouped.map((row) => (
            <li
              key={row.source}
              className="flex items-center justify-between rounded-2xl border px-4 py-3"
              style={{
                background: WORKDESK_CARD.background,
                borderColor: WORKDESK_CARD.borderColor,
                boxShadow: WORKDESK_CARD.boxShadow,
              }}
            >
              <span className="text-sm font-semibold" style={{ color: SLATE_HORIZON.ink }}>
                {row.source}
              </span>
              <span className="text-sm tabular-nums" style={{ color: SLATE_HORIZON.muted }}>
                {row.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </ModuleShell>
  );
}
