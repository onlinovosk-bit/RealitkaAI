"use client";

import { useEffect, useState } from "react";

type Payload = {
  topSteps: string[];
  closeProbability: number;
  allSteps: string[];
  timeToCloseDays: number;
  brainScore: number;
};

export default function DealStrategyCard({ leadId }: { leadId: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/leads/${leadId}/deal-strategy`);
        const json = (await res.json()) as {
          ok?: boolean;
          topSteps?: string[];
          closeProbability?: number;
          allSteps?: string[];
          timeToCloseDays?: number;
          brainScore?: number;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !json.ok) {
          setError(json.error ?? "Stratégia nie je dostupná.");
          return;
        }
        setData({
          topSteps: json.topSteps ?? [],
          closeProbability: json.closeProbability ?? 0,
          allSteps: json.allSteps ?? [],
          timeToCloseDays: json.timeToCloseDays ?? 0,
          brainScore: json.brainScore ?? 0,
        });
      } catch {
        if (!cancelled) setError("Chyba siete.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-5 text-sm text-slate-400">
        Načítavam AI Deal Strategy…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5 text-sm text-amber-200/90">
        {error ?? "Žiadne dáta."}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/50 via-slate-900/80 to-slate-950 p-5 text-white shadow-[0_0_24px_rgba(99,102,241,0.12)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300/90">AI Deal Strategy</p>
      <p className="mt-1 text-xs text-slate-400">
        Brain skóre {data.brainScore} · TTC ~{data.timeToCloseDays} dní · Pravdepodobnosť uzavretia ~{data.closeProbability}%
      </p>
      <p className="mt-3 text-xs font-semibold text-slate-400">Top kroky</p>
      <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm text-indigo-100">
        {data.topSteps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      {data.allSteps.length > data.topSteps.length && (
        <details className="mt-3 text-xs text-slate-500">
          <summary className="cursor-pointer text-indigo-300/80">Ďalšie kroky</summary>
          <ul className="mt-2 list-inside list-disc space-y-1 text-slate-400">
            {data.allSteps.slice(data.topSteps.length).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
