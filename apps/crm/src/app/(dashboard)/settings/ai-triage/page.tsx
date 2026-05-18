"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RunMetrics = {
  runs_observed: number;
  avg_duration_ms: number | null;
  total_stale_lock_recoveries: number;
  total_ai_api_fallback_leads: number;
  error_runs: number;
};

type TriageHealth = {
  ok: boolean;
  window_hours?: number;
  triaged_total?: number;
  ai_native_count?: number;
  fallback_count?: number;
  fallback_ratio?: number | null;
  run_metrics?: RunMetrics | null;
  hints?: {
    batch_duration: string;
    stale_recovery: string;
    ai_failures: string;
  };
  error?: string;
};

function pct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n * 100)} %`;
}

function fmtDuration(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export default function AiTriageSettingsPage() {
  const [data, setData] = useState<TriageHealth | null>(null);

  useEffect(() => {
    void fetch("/api/ai/triage-health")
      .then((r) => r.json())
      .then((d: TriageHealth) => setData(d))
      .catch(() => setData({ ok: false, error: "Sieť" }));
  }, []);

  const rm = data?.run_metrics;

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-10 font-sans" style={{ background: "#050914", minHeight: "100vh" }}>
      <Link href="/settings" className="text-sm" style={{ color: "#64748B" }}>
        ← Nastavenia
      </Link>
      <h1 className="mt-4 text-2xl font-black tracking-tight" style={{ color: "#F0F9FF" }}>
        AI triáž — viditeľnosť
      </h1>
      <p className="mt-2 max-w-2xl text-sm" style={{ color: "#64748B" }}>
        Prehľad kvality a spoľahlivosti automatickej priority (posledných 24 hodín pre vašu agentúru).
        Beh cronusa sa ukladá do{" "}
        <code className="text-cyan-300/90">ai_triage_run_metrics</code> po aplikácii migrácie; logy zostávajú s
        prefixom <code className="text-cyan-300/90">[ai_triage]</code>.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section
          className="rounded-2xl border p-5"
          style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
        >
          <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "#475569" }}>
            AI vs záložné skóre
          </h2>
          {!data ? (
            <p className="mt-3 text-sm" style={{ color: "#64748B" }}>
              Načítavam…
            </p>
          ) : !data.ok ? (
            <p className="mt-3 text-sm text-red-300">{data.error ?? "Chyba"}</p>
          ) : (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt style={{ color: "#94A3B8" }}>Triážovaných leadov</dt>
                <dd className="font-mono" style={{ color: "#F0F9FF" }}>
                  {data.triaged_total ?? 0}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt style={{ color: "#94A3B8" }}>AI výstup (bez zálohy)</dt>
                <dd className="font-mono text-cyan-200">{data.ai_native_count ?? 0}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt style={{ color: "#94A3B8" }}>Záložné skóre / degradácia</dt>
                <dd className="font-mono text-amber-200">{data.fallback_count ?? 0}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-white/5 pt-2">
                <dt style={{ color: "#94A3B8" }}>Podiel zálohy</dt>
                <dd className="font-mono" style={{ color: "#F0F9FF" }}>
                  {pct(data.fallback_ratio ?? null)}
                </dd>
              </div>
            </dl>
          )}
          <p className="mt-3 text-xs leading-snug" style={{ color: "#475569" }}>
            Záloha = výstup s „Fallback skóre“, chybou parsovania JSON alebo „AI volanie zlyhalo“ v{" "}
            <code className="text-slate-500">ai_reason</code>.
          </p>
        </section>

        <section
          className="rounded-2xl border p-5"
          style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
        >
          <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "#475569" }}>
            Beh triáže (24 h)
          </h2>
          {!data?.ok && data ? (
            <p className="mt-3 text-sm text-red-300">{data.error ?? "Chyba"}</p>
          ) : rm ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt style={{ color: "#94A3B8" }}>Pozorovaných behov</dt>
                <dd className="font-mono" style={{ color: "#F0F9FF" }}>
                  {rm.runs_observed}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt style={{ color: "#94A3B8" }}>Priemerné trvanie</dt>
                <dd className="font-mono text-cyan-200">{fmtDuration(rm.avg_duration_ms)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt style={{ color: "#94A3B8" }}>Stale lock recovery (súčet)</dt>
                <dd className="font-mono" style={{ color: "#F0F9FF" }}>
                  {rm.total_stale_lock_recoveries}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt style={{ color: "#94A3B8" }}>Leadov s API fallbackom</dt>
                <dd className="font-mono text-amber-200">{rm.total_ai_api_fallback_leads}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-white/5 pt-2">
                <dt style={{ color: "#94A3B8" }}>Behov s chybou</dt>
                <dd className="font-mono text-red-300/90">{rm.error_runs}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "#64748B" }}>
              Zatiaľ žiadne riadky v <code className="text-slate-500">ai_triage_run_metrics</code> pre túto
              agentúru (alebo migrácia ešte nebežala). Po prvom crone sa tu zobrazí priemer trvania, recovery a
              API fallback.
            </p>
          )}
          <ul className="mt-4 space-y-2 text-xs leading-relaxed" style={{ color: "#475569" }}>
            <li>
              <span className="font-semibold text-slate-500">Trvanie:</span>{" "}
              {data?.hints?.batch_duration}
            </li>
            <li>
              <span className="font-semibold text-slate-500">Stale lock:</span>{" "}
              {data?.hints?.stale_recovery}
            </li>
            <li>
              <span className="font-semibold text-slate-500">API zlyhania (lead):</span>{" "}
              {data?.hints?.ai_failures}
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
