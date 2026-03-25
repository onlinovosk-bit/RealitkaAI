function getBadge(state: string) {
  switch (state) {
    case "trial":
      return "bg-blue-100 text-blue-700";
    case "active":
      return "bg-green-100 text-green-700";
    case "grace":
      return "bg-yellow-100 text-yellow-700";
    case "limited":
      return "bg-orange-100 text-orange-700";
    case "blocked":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getStateLabel(state: string) {
  switch (state) {
    case "trial":
      return "Skúšobné";
    case "active":
      return "Aktívne";
    case "grace":
      return "Ochranná lehota";
    case "limited":
      return "Obmedzené";
    case "blocked":
      return "Zablokované";
    default:
      return state;
  }
}

export default function TrialGraceCard({
  trialGrace,
}: {
  trialGrace: {
    state: string;
    trialDaysLeft: number;
    graceDaysLeft: number;
    message: string;
  };
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Skúšobné obdobie / ochranná lehota</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getBadge(trialGrace.state)}`}>
          {getStateLabel(trialGrace.state)}
        </span>
      </div>

      <p className="mt-4 text-sm text-gray-600">{trialGrace.message}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-sm text-gray-500">Zostávajúce dni skúšobného obdobia</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{trialGrace.trialDaysLeft}</p>
        </div>

        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-sm text-gray-500">Zostávajúce dni ochrannej lehoty</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">{trialGrace.graceDaysLeft}</p>
        </div>
      </div>
    </div>
  );
}
