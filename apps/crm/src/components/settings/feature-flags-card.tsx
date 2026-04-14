function FeatureItem({
  title,
  enabled,
}: {
  title: string;
  enabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      <span className="text-sm font-medium text-gray-800">{title}</span>
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          enabled ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
        }`}
      >
        {enabled ? "Zapnuté" : "Vypnuté"}
      </span>
    </div>
  );
}

export default function FeatureFlagsCard({
  flags,
}: {
  flags: Record<string, boolean>;
}) {
  const labels: Record<string, string> = {
    aiScoring: "AI scoring",
    aiRecommendations: "AI odporúčania",
    matching: "Matching engine",
    forecasting: "Forecasting",
    communicationHub: "Communication Hub",
    outreach: "Outreach",
    integrations: "Integrations",
    teamManagement: "Team management",
    advancedReporting: "Advanced reporting",
    billing: "Predplatné",
  };

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900">Feature flags podľa plánu</h2>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        {Object.entries(flags).map(([key, value]) => (
          <FeatureItem key={key} title={labels[key] || key} enabled={value} />
        ))}
      </div>
    </div>
  );
}
