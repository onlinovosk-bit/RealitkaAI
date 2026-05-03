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
      style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold" style={{ color: "#F0F9FF" }}>Počítadlá podľa maklérov</h2>
        <p className="text-sm" style={{ color: "#64748B" }}>
          Výkonnosť, počet príležitostí a kvalita portfólia.
        </p>
      </div>

      <div className="space-y-3">
        {grouped.map((agent) => (
          <div
            key={agent.name}
            className="rounded-xl border p-4"
            style={{ background: "#0A1628", borderColor: "#112240" }}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-medium" style={{ color: "#F0F9FF" }}>{agent.name}</h3>
                <p className="text-sm" style={{ color: "#64748B" }}>{agent.total} príležitostí celkom</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: "rgba(34,211,238,0.10)", color: "#22D3EE" }}
                >
                  Horúce: {agent.hot}
                </span>
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: "rgba(99,102,241,0.12)", color: "#A5B4FC" }}
                >
                  Obhliadky: {agent.showings}
                </span>
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: "rgba(52,211,153,0.12)", color: "#34D399" }}
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
            style={{ borderColor: "#0F1F3D", color: "#475569" }}
          >
            Zatiaľ nie sú dostupné žiadne údaje o makléroch.
          </div>
        )}
      </div>
    </div>
  );
}
