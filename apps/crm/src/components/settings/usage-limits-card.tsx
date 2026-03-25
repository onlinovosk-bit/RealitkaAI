function UsageBar({
  label,
  value,
  limit,
  percent,
}: {
  label: string;
  value: number;
  limit: number;
  percent: number;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-sm text-gray-500">
          {value} / {limit}
        </p>
      </div>

      <div className="mt-3 h-3 w-full rounded-full bg-gray-200">
        <div className="h-3 rounded-full bg-gray-900" style={{ width: `${Math.min(100, percent)}%` }} />
      </div>

      <p className="mt-2 text-xs text-gray-500">{percent} % využitia</p>
    </div>
  );
}

export default function UsageLimitsCard({
  usage,
  limits,
  usageHealth,
}: {
  usage: {
    agents: number;
    leads: number;
    properties: number;
    teams: number;
  };
  limits: {
    maxAgents: number;
    maxLeads: number;
    maxProperties: number;
    maxTeams: number;
    monthlyInboxSyncMessages: number;
    monthlyPortalImports: number;
    activeAutomationFlows: number;
  };
  usageHealth: {
    agentsPercent: number;
    leadsPercent: number;
    propertiesPercent: number;
    teamsPercent: number;
  };
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900">Limity podľa tarifu</h2>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <UsageBar label="Agenti" value={usage.agents} limit={limits.maxAgents} percent={usageHealth.agentsPercent} />

        <UsageBar label="Leady" value={usage.leads} limit={limits.maxLeads} percent={usageHealth.leadsPercent} />

        <UsageBar
          label="Nehnuteľnosti"
          value={usage.properties}
          limit={limits.maxProperties}
          percent={usageHealth.propertiesPercent}
        />

        <UsageBar label="Tímy" value={usage.teams} limit={limits.maxTeams} percent={usageHealth.teamsPercent} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-sm text-gray-500">Inbox sync / mesiac</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{limits.monthlyInboxSyncMessages}</p>
        </div>

        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-sm text-gray-500">Portal imports / mesiac</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{limits.monthlyPortalImports}</p>
        </div>

        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-sm text-gray-500">Automation flows</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{limits.activeAutomationFlows}</p>
        </div>
      </div>
    </div>
  );
}
