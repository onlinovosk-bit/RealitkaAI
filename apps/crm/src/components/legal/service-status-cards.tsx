"use client";

import { useCallback, useEffect, useState } from "react";

type CheckResult = {
  label: string;
  endpoint: string;
  ok: boolean;
  detail: string;
};

const checks = [
  { label: "Public Health API", endpoint: "/api/healthz" },
  { label: "Landing page", endpoint: "/landing" },
  { label: "Legal hub", endpoint: "/legal" },
];

export default function ServiceStatusCards() {
  const [results, setResults] = useState<CheckResult[]>(
    checks.map((c) => ({ label: c.label, endpoint: c.endpoint, ok: false, detail: "Kontrolujem..." })),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchWithRetry = useCallback(async (endpoint: string, retries = 2) => {
    let attempt = 0;
    while (attempt <= retries) {
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        if (!response.ok && [408, 425, 429, 500, 502, 503, 504].includes(response.status) && attempt < retries) {
          attempt += 1;
          await new Promise((resolve) => setTimeout(resolve, 400 * Math.pow(2, attempt - 1)));
          continue;
        }
        return response;
      } catch {
        if (attempt >= retries) throw new Error("network failed");
        attempt += 1;
        await new Promise((resolve) => setTimeout(resolve, 400 * Math.pow(2, attempt - 1)));
      }
    }
    throw new Error("network failed");
  }, []);

  const runChecks = useCallback(async () => {
    setIsRefreshing(true);
    const next = await Promise.all(
      checks.map(async (check) => {
        try {
          const response = await fetchWithRetry(check.endpoint);
          return {
            label: check.label,
            endpoint: check.endpoint,
            ok: response.ok,
            detail: response.ok ? "OK" : `HTTP ${response.status}`,
          };
        } catch {
          return {
            label: check.label,
            endpoint: check.endpoint,
            ok: false,
            detail: "Nedostupné (po retry)",
          };
        }
      }),
    );
    setResults(next);
    setIsRefreshing(false);
  }, [fetchWithRetry]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await runChecks();
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [runChecks]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-slate-500">Status checks používajú automatický retry (2 pokusy).</p>
        <button
          type="button"
          onClick={() => void runChecks()}
          disabled={isRefreshing}
          className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 hover:border-cyan-400 disabled:opacity-60"
        >
          {isRefreshing ? "Obnovujem..." : "Obnoviť status"}
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
      {results.map((result) => (
        <div key={result.label} className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
          <p className="text-xs text-slate-400">{result.label}</p>
          <p className={`mt-1 text-sm font-semibold ${result.ok ? "text-emerald-300" : "text-red-300"}`}>
            {result.detail}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">{result.endpoint}</p>
        </div>
      ))}
      </div>
    </div>
  );
}
