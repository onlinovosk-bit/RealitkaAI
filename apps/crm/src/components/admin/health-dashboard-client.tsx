"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Loader2,
  Server,
} from "lucide-react";

type HealthPayload = {
  ok: boolean;
  embeddings?: {
    leadsIndexed: number;
    leadsTotal: number;
    propertiesIndexed: number;
    propertiesTotal: number;
    coverageLeads: number | null;
    coverageProperties: number | null;
  };
  cron?: { lastDailyMatchAt: string | null; lastPayload: unknown };
  integrations?: {
    smokeChecks: { ok: boolean; label: string; message: string }[];
    smokeOk: boolean | null;
  };
  generatedAt?: string;
  error?: string;
};

export default function HealthDashboardClient() {
  const [data, setData] = useState<HealthPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/system/health-dashboard");
        const json = await res.json();
        if (!cancelled) {
          if (!res.ok) {
            setData({
              ok: false,
              error: json.error || `HTTP ${res.status}`,
            });
          } else {
            setData({
              ok: true,
              embeddings: json.embeddings,
              cron: json.cron,
              integrations: json.integrations,
              generatedAt: json.generatedAt,
            });
          }
        }
      } catch {
        if (!cancelled) {
          setData({
            ok: false,
            error: "Sieťová chyba pri načítaní health API.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return (
      <div className="flex items-center gap-2 p-8 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Načítavam SLA / health…
      </div>
    );
  }

  if (!data.ok && data.error) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Health API</p>
          <p className="text-sm opacity-90">{data.error}</p>
        </div>
      </div>
    );
  }

  const e = data.embeddings;
  const cron = data.cron;
  const smoke = data.integrations?.smokeChecks ?? [];

  return (
    <div className="space-y-6 p-6 text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            SLA &amp; systémové zdravie
          </h1>
          <p className="text-sm text-slate-500">
            Embeddings, posledný cron matching, smoke integrácií.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock className="h-4 w-4" />
          {data.generatedAt
            ? new Date(data.generatedAt).toLocaleString("sk-SK")
            : "—"}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div
          className="rounded-2xl border border-indigo-500/20 p-5"
          style={{ background: "#080D1A" }}
        >
          <div className="mb-3 flex items-center gap-2 text-indigo-300">
            <Database className="h-5 w-5" />
            <h2 className="font-semibold">Embeddings</h2>
          </div>
          {e ? (
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                Leady:{" "}
                <span className="font-mono text-white">
                  {e.leadsIndexed} / {e.leadsTotal}
                </span>
                {e.coverageLeads != null && (
                  <span className="text-slate-500">
                    {" "}
                    ({e.coverageLeads}%)
                  </span>
                )}
              </li>
              <li>
                Ponuky:{" "}
                <span className="font-mono text-white">
                  {e.propertiesIndexed} / {e.propertiesTotal}
                </span>
                {e.coverageProperties != null && (
                  <span className="text-slate-500">
                    {" "}
                    ({e.coverageProperties}%)
                  </span>
                )}
              </li>
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Bez dát</p>
          )}
        </div>

        <div
          className="rounded-2xl border border-cyan-500/20 p-5"
          style={{ background: "#080D1A" }}
        >
          <div className="mb-3 flex items-center gap-2 text-cyan-300">
            <Server className="h-5 w-5" />
            <h2 className="font-semibold">Cron – denný matching</h2>
          </div>
          <p className="text-sm text-slate-300">
            Posledný beh:{" "}
            <span className="text-white">
              {cron?.lastDailyMatchAt
                ? new Date(cron.lastDailyMatchAt).toLocaleString("sk-SK")
                : "zatiaľ žiadny záznam"}
            </span>
          </p>
        </div>
      </section>

      <section
        className="rounded-2xl border border-slate-700/50 p-5"
        style={{ background: "#080D1A" }}
      >
        <div className="mb-4 flex items-center gap-2 text-slate-300">
          <Activity className="h-5 w-5" />
          <h2 className="font-semibold">Integrácie (smoke)</h2>
          {data.integrations?.smokeOk != null &&
            (data.integrations.smokeOk ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            ))}
        </div>
        <ul className="space-y-2">
          {smoke.length === 0 ? (
            <li className="text-sm text-slate-500">Žiadne kontroly</li>
          ) : (
            smoke.map((c, i) => (
              <li
                key={`${c.label}-${i}`}
                className="flex items-start gap-2 text-sm"
              >
                {c.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                )}
                <span>
                  <span className="font-medium text-slate-200">{c.label}</span>
                  <span className="block text-slate-500">{c.message}</span>
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
