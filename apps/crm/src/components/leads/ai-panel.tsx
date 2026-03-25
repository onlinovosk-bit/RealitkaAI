import type { Recommendation } from "@/lib/mock-data";

function getPriorityClasses(priority: Recommendation["priority"]) {
  switch (priority) {
    case "Vysoká":
      return "bg-red-100 text-red-700";
    case "Stredná":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function AiPanel({
  title = "AI odporúčania",
  recommendations,
}: {
  title?: string;
  recommendations: Recommendation[];
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">
          Systém navrhuje ďalšie kroky podľa skóre leadu a aktivity.
        </p>
      </div>

      <div className="space-y-3">
        {recommendations.map((item) => (
          <div key={item.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="font-medium text-gray-900">{item.title}</h3>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getPriorityClasses(item.priority)}`}>
                {item.priority}
              </span>
            </div>

            <p className="text-sm text-gray-600">{item.description}</p>
          </div>
        ))}

        {recommendations.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
            Zatiaľ nie sú dostupné žiadne AI odporúčania.
          </div>
        )}
      </div>
    </div>
  );
}
