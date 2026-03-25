"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RecalculateRecommendationsPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleRecalculateAll() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/recommendations/recalculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa prepočítať AI odporúčania.");
      }

      setMessage(
        `AI odporúčania boli prepočítané. Zapísaných odporúčaní: ${data.result.totalRows ?? data.result.inserted ?? 0}`
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Nepodarilo sa prepočítať AI odporúčania."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">AI Recommendations Engine</h2>
          <p className="text-sm text-gray-500">
            Prepočíta a uloží odporúčania do databázy ai_recommendations.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRecalculateAll}
          disabled={loading}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {loading ? "Prepočítavam..." : "Prepočítať odporúčania"}
        </button>
      </div>

      {message && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          {message}
        </div>
      )}
    </div>
  );
}
