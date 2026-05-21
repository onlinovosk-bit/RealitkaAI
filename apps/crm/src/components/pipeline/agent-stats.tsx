import {
  SLATE_HORIZON,
  SLATE_HORIZON_BADGES,
  WORKDESK_CARD,
  WORKDESK_INNER_ROW,
  WORKDESK_PANEL,
} from "@/lib/slate-horizon-theme";

type AgentStatsProps = {
  leads: Array<{
    id: string;
    assignedAgent: string;
    status: string;
    score: number;
  }>;
};

export default function AgentStats({ leads }: AgentStatsProps) {
  const grouped = Object.values(
    leads.reduce((acc, lead) => {
      const key = lead.assignedAgent || "Nepriradený";

      if (!acc[key]) {
        acc[key] = {
          name: key,
          total: 0,
          hot: 0,
          showings: 0,
          avgScore: 0,
          scoreSum: 0,
        };
      }

      acc[key].total += 1;
      acc[key].scoreSum += lead.score;

      if (lead.status === "Horúci") acc[key].hot += 1;
      if (lead.status === "Obhliadka") acc[key].showings += 1;

      return acc;
    }, {} as Record<string, {
      name: string;
      total: number;
      hot: number;
      showings: number;
      avgScore: number;
      scoreSum: number;
    }>)
  )
    .map((item) => ({
      ...item,
      avgScore: item.total > 0 ? Math.round(item.scoreSum / item.total) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        background: WORKDESK_PANEL.background,
        borderColor: WORKDESK_PANEL.borderColor,
        boxShadow: WORKDESK_PANEL.boxShadow,
      }}
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold" style={{ color: SLATE_HORIZON.ink }}>Počítadlá podľa maklérov</h2>
        <p className="text-sm" style={{ color: SLATE_HORIZON.muted }}>
          Výkonnosť, počet príležitostí a kvalita portfólia.
        </p>
      </div>

      <div className="space-y-3">
        {grouped.map((agent) => (
          <div
            key={agent.name}
            className="rounded-xl border p-4"
            style={{
              background: WORKDESK_INNER_ROW.background,
              borderColor: WORKDESK_CARD.borderColor,
            }}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-medium" style={{ color: SLATE_HORIZON.ink }}>{agent.name}</h3>
                <p className="text-sm" style={{ color: SLATE_HORIZON.muted }}>{agent.total} príležitostí celkom</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    background: SLATE_HORIZON_BADGES.hot.bg,
                    color: SLATE_HORIZON_BADGES.hot.color,
                  }}
                >
                  Horúce: {agent.hot}
                </span>
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    background: SLATE_HORIZON_BADGES.pro.bg,
                    color: SLATE_HORIZON_BADGES.pro.color,
                  }}
                >
                  Obhliadky: {agent.showings}
                </span>
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    background: "#DCFCE7",
                    color: SLATE_HORIZON.greenDark,
                  }}
                >
                  Priem. score: {agent.avgScore}
                </span>
              </div>
            </div>
          </div>
        ))}

        {grouped.length === 0 && (
          <div
            className="rounded-xl border border-dashed p-4 text-sm"
            style={{ borderColor: WORKDESK_CARD.borderColor, color: SLATE_HORIZON.muted }}
          >
            Zatiaľ nie sú dostupné žiadne údaje o makléroch.
          </div>
        )}
      </div>
    </div>
  );
}
