function getRoleBadge(role: string) {
  switch (role) {
    case "owner":
      return "bg-purple-100 text-purple-700";
    case "manager":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-green-100 text-green-700";
  }
}

export default function AgentPerformanceTable({
  rows,
}: {
  rows: Array<{
    profileId: string;
    fullName: string;
    role: string;
    totalLeads: number;
    hotLeads: number;
    showings: number;
    offers: number;
    avgScore: number;
    openTasks: number;
    doneTasks: number;
  }>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Výkon agentov</h2>
        <p className="text-sm text-gray-500">
          Prehľad leadov, obhliadok, ponúk a úloh podľa ľudí.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">Meno</th>
              <th className="px-5 py-3 font-medium">Rola</th>
              <th className="px-5 py-3 font-medium">Leady</th>
              <th className="px-5 py-3 font-medium">Horúce</th>
              <th className="px-5 py-3 font-medium">Obhliadky</th>
              <th className="px-5 py-3 font-medium">Ponuky</th>
              <th className="px-5 py-3 font-medium">Priem. score</th>
              <th className="px-5 py-3 font-medium">Open tasks</th>
              <th className="px-5 py-3 font-medium">Done tasks</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.profileId} className="hover:bg-gray-50">
                <td className="px-5 py-4 font-medium text-gray-900">{row.fullName}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadge(row.role)}`}>
                    {row.role}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-700">{row.totalLeads}</td>
                <td className="px-5 py-4 text-gray-700">{row.hotLeads}</td>
                <td className="px-5 py-4 text-gray-700">{row.showings}</td>
                <td className="px-5 py-4 text-gray-700">{row.offers}</td>
                <td className="px-5 py-4 text-gray-700">{row.avgScore}</td>
                <td className="px-5 py-4 text-gray-700">{row.openTasks}</td>
                <td className="px-5 py-4 text-gray-700">{row.doneTasks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="border-t border-gray-200 p-5 text-sm text-gray-500">
          Zatiaľ nie sú dostupné dáta o agentoch.
        </div>
      )}
    </div>
  );
}
