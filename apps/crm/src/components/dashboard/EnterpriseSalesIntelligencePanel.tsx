"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { EnterpriseInsightRow } from "@/lib/db/enterprise-intelligence-store";
import { subscribeLeadEvents } from "@/lib/realtime/enterprise-lead-events";
import { supabaseClient } from "@/lib/supabase/client";

type Props = {
  enabled: boolean;
};

export default function EnterpriseSalesIntelligencePanel({ enabled }: Props) {
  const [insights, setInsights] = useState<EnterpriseInsightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/insights");
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Nepodarilo sa načítať AI insight.");
        setInsights([]);
        return;
      }
      setInsights(Array.isArray(data.insights) ? data.insights : []);
    } catch {
      setError("Chyba siete pri načítaní insightov.");
      setInsights([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabaseClient.auth.getUser();
        if (!user || cancelled) return;
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("agency_id")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        if (!cancelled) setAgencyId(profile?.agency_id ?? null);
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    return subscribeLeadEvents(agencyId, () => {
      void load();
    });
  }, [enabled, agencyId, load]);

  if (!enabled) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-slate-950/90 via-slate-900/80 to-indigo-950/40 p-5 shadow-[0_0_40px_rgba(99,102,241,0.12)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300/90">
            Enterprise
          </p>
          <h3 className="text-lg font-bold text-slate-100">
            AI Sales Intelligence
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Deal Moment · Risk · Client DNA · odporúčané akcie (iba Enterprise plán)
          </p>
        </div>
        <Link
          href="/billing"
          className="text-xs font-medium text-indigo-300/90 underline-offset-2 hover:text-indigo-200 hover:underline"
        >
          Plány
        </Link>
      </div>

      {loading && (
        <p className="text-sm text-slate-500">Načítavam odporúčania…</p>
      )}
      {error && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-sm text-amber-100/90">
          {error}
        </p>
      )}

      {!loading && !error && insights.length === 0 && (
        <p className="text-sm text-slate-500">
          Zatiaľ žiadne uložené akcie. Pridaj udalosti k leadom alebo spusti spracovanie na detaile
          príležitosti.
        </p>
      )}

      <ul className="mt-3 space-y-3">
        {insights.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
          >
            <p className="font-semibold text-slate-100">{item.lead_name}</p>
            <p className="mt-1 text-xs text-slate-500">
              Score: {item.score ?? "—"} | Risk: {item.risk ?? "—"}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              <span className="text-indigo-300/95">→</span> {item.action}
            </p>
            <p className="mt-1 text-xs text-slate-500">{item.reason}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/leads/${item.lead_id}`}
                className="inline-flex rounded-lg bg-indigo-500/90 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-400"
              >
                Otvoriť príležitosť
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
