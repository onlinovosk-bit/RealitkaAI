"use client";

import { useState } from "react";

type SmokeCheck = {
  key: string;
  label: string;
  ok: boolean;
  message: string;
};

function getBadge(ok: boolean) {
  return ok
    ? "bg-green-100 text-green-700"
    : "bg-red-100 text-red-700";
}

export default function SmokeTestPanel() {
  const [loading, setLoading] = useState(false);
  const [checks, setChecks] = useState<SmokeCheck[]>([]);
  const [summary, setSummary] = useState<string>("");

  async function runTests() {
    setLoading(true);
    setSummary("");
    setChecks([]);

    try {
      const response = await fetch("/api/system/smoke");
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Smoke test zlyhal.");
      }

      setChecks(data.checks ?? []);
      setSummary(
        data.ok
          ? "Všetky automatické smoke testy prešli úspešne."
          : "Niektoré smoke testy zlyhali. Skontroluj detaily nižšie."
      );
    } catch (error) {
      setSummary(
        error instanceof Error ? error.message : "Smoke test sa nepodarilo spustiť."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Automatické smoke testy</h2>
          <p className="text-sm text-gray-500">
            Otestujú načítanie kľúčových modulov a prostredia.
          </p>
        </div>

        <button
          type="button"
          onClick={runTests}
          disabled={loading}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {loading ? "Testujem..." : "Spustiť smoke test"}
        </button>
      </div>

      {summary && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          {summary}
        </div>
      )}

      {checks.length > 0 && (
        <div className="mt-4 space-y-3">
          {checks.map((check) => (
            <div
              key={check.key}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-gray-900">{check.label}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getBadge(check.ok)}`}>
                  {check.ok ? "OK" : "Chyba"}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600">{check.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
