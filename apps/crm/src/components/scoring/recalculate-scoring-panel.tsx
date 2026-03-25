"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RecalculateScoringPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function handleRecalculate() {
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch("/api/scoring/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa prepočítať AI scoring.");
      }

      setMessage(
        `AI Scoring 2.0 bol prepočítaný. Spracovaných leadov: ${data.result.results.length}.`
      );
      router.refresh();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Nepodarilo sa prepočítať AI scoring."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">AI Scoring 2.0</h2>
          <p className="text-sm text-gray-500">
            Prepočíta lead scoring, priority a odporúčania podľa správania a matchingu.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRecalculate}
          disabled={loading}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {loading ? "Prepočítavam..." : "Prepočítať scoring"}
        </button>
      </div>

      {message && (
        <div
          className={`mt-4 rounded-lg border p-3 text-sm ${
            isError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
