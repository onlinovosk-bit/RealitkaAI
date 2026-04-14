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
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Počítadlá podľa maklérov</h2>
        <p className="text-sm text-gray-500">
          Výkonnosť, počet príležitostí a kvalita portfólia.
        </p>
      </div>

      <div className="space-y-3">
        {grouped.map((agent) => (
          <div key={agent.name} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{agent.name}</h3>
                <p className="text-sm text-gray-500">{agent.total} príležitostí celkom</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  Horúce: {agent.hot}
                </span>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  Obhliadky: {agent.showings}
                </span>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  Priem. score: {agent.avgScore}
                </span>
              </div>
            </div>
          </div>
        ))}

        {grouped.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
            Zatiaľ nie sú dostupné žiadne údaje o makléroch.
          </div>
        )}
      </div>
    </div>
  );
}