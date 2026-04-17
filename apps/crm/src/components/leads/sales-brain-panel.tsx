"use client";

import { useEffect, useState } from "react";

type Profile = {
  engineVersion: string;
  score: number;
  legacyScore: number;
  multiModelScore: number;
  weightedSignalScore: number;
  confidence: number;
  confidenceTier: string;
  timeToCloseDays: number;
  timeToCloseHint: string;
  breakdown: {
    engagement: number;
    intent: number;
    timing: number;
    behavioral: number;
  };
  breakdownLabels: {
    engagement: string;
    intent: string;
    timing: string;
    behavioral: string;
  };
  explainability: string[];
  nextBestAction: string;
  selfLearning: { outcomeSamples: number; note: string };
};

export default function SalesBrainPanel({ leadId }: { leadId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/leads/${leadId}/sales-brain`);
        const data = (await res.json()) as { ok?: boolean; profile?: Profile; error?: string };
        if (cancelled) return;
        if (!res.ok || !data.ok || !data.profile) {
          setError(data.error ?? "Nepodarilo sa načítať AI Sales Brain.");
          return;
        }
        setProfile(data.profile);
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
      <div className="rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-5 text-sm text-slate-400">
        Načítavam AI Sales Brain…
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-5 text-sm text-amber-200/90">
        {error ?? "Profil nie je k dispozícii."}
      </div>
    );
  }

  const tierColor =
    profile.confidenceTier === "vysoká"
      ? "text-emerald-300"
      : profile.confidenceTier === "stredná"
        ? "text-amber-200"
        : "text-slate-400";

  return (
    <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/40 p-5 shadow-[0_0_32px_rgba(34,211,238,0.12)]">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400/90">
            AI Sales Brain · {profile.engineVersion}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Scoring + confidence + multi-model + time-to-close + explainability
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Brain skóre</p>
          <p className="text-3xl font-bold text-white">{profile.score}</p>
          <p className="text-[11px] text-slate-500">
            CRM {profile.legacyScore} · multi {profile.multiModelScore} · váhy {profile.weightedSignalScore}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Confidence</p>
          <p className={`text-3xl font-bold ${tierColor}`}>{profile.confidence}%</p>
          <p className="text-[11px] text-slate-500">{profile.confidenceTier} istota</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Time to close</p>
          <p className="text-3xl font-bold text-cyan-200">{profile.timeToCloseDays} dní</p>
          <p className="text-[11px] text-cyan-300/80">{profile.timeToCloseHint}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/5 bg-black/20 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Multi-model</p>
        <ul className="space-y-1.5 text-xs text-slate-300">
          <li className="flex justify-between gap-2">
            <span>Engagement</span>
            <span className="text-slate-100">
              {profile.breakdown.engagement} — {profile.breakdownLabels.engagement}
            </span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Intent</span>
            <span className="text-slate-100">
              {profile.breakdown.intent} — {profile.breakdownLabels.intent}
            </span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Timing</span>
            <span className="text-slate-100">
              {profile.breakdown.timing} — {profile.breakdownLabels.timing}
            </span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Behavioral</span>
            <span className="text-slate-100">
              {profile.breakdown.behavioral} — {profile.breakdownLabels.behavioral}
            </span>
          </li>
        </ul>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Prečo</p>
        <ul className="list-inside list-disc space-y-1 text-xs text-slate-300">
          {profile.explainability.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-950/30 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-300/90">Akcia</p>
        <p className="mt-1 text-sm text-violet-100">{profile.nextBestAction}</p>
      </div>

      <p className="mt-3 text-[10px] leading-snug text-slate-500">
        Self-learning: {profile.selfLearning.note}
      </p>
    </div>
  );
}
