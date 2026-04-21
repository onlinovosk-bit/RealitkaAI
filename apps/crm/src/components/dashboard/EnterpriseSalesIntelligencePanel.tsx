"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { EnterpriseInsightRow } from "@/lib/db/enterprise-intelligence-store";
import { subscribeLeadEvents } from "@/lib/realtime/enterprise-lead-events";
import { supabaseClient } from "@/lib/supabase/client";

type BriHistoryRow = {
  id: string;
  bri_score: number;
  reasoning_string: string;
  calculated_at: string;
  leads: { id: string; name: string } | null;
};

type Props = {
  enabled: boolean;
};

export default function EnterpriseSalesIntelligencePanel({ enabled }: Props) {
  const [insights, setInsights] = useState<EnterpriseInsightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [briHistory, setBriHistory] = useState<BriHistoryRow[]>([]);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const [insightsRes, briRes] = await Promise.all([
        fetch("/api/ai/insights"),
        fetch("/api/l99/bri-history"),
      ]);
      const insightsData = await insightsRes.json();
      if (!insightsRes.ok) {
        setError(insightsData?.error ?? "Nepodarilo sa načítať AI insight.");
        setInsights([]);
      } else {
        setInsights(Array.isArray(insightsData.insights) ? insightsData.insights : []);
      }
      if (briRes.ok) {
        const briData = await briRes.json();
        setBriHistory(Array.isArray(briData.history) ? briData.history : []);
      }
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
    return (
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-slate-950/90 via-slate-900/80 to-indigo-950/40 p-5">
        <div className="enterprise-locked">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300/90">Enterprise</p>
          <h3 className="text-lg font-bold text-slate-100">AI Sales Intelligence</h3>
          <p className="mt-1 text-xs text-slate-500">Deal Moment · Risk · Client DNA · BRI skóre</p>
          <div className="mt-4 space-y-2">
            {["Záujemca Novák – BRI 91/100 🔥", "Záujemca Kováč – BRI 78/100 ⚡", "Záujemca Horváth – BRI 65/100 📊"].map((item) => (
              <div key={item} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-400">{item}</div>
            ))}
          </div>
        </div>
        <div className="enterprise-locked-overlay">
          <div className="px-6 text-center max-w-sm mx-auto">
            <p className="mb-2 text-2xl">⭐</p>
            <p className="mb-1 text-sm font-bold text-white">AI Obchodná inteligencia – len Enterprise</p>
            <div className="mb-4 grid grid-cols-2 gap-1.5 text-left">
              {[
                "BRI skóre pripravenosti kúpy",
                "Prioritné SMS alerting (BRI ≥ 88)",
                "Sledovanie konkurencie v reálnom čase",
                "Spiace príležitosti — obnova starých leadov",
                "Manažérske reporty pre vlastníka",
                "AI pamäť celého tímu",
                "Multi-tím a multi-pobočka",
                "5 Pro licencií pre maklérov v cene",
                "Dedikovaný Account Manager",
                "SLA podpora do 1 hodiny",
                "API prístup pre vlastné integrácie",
                "Vlastné automatizácie bez kódu",
              ].map((f) => (
                <div key={f} className="flex items-start gap-1.5 text-[11px] text-slate-400">
                  <span className="mt-px shrink-0 text-indigo-400">✓</span>
                  {f}
                </div>
              ))}
            </div>
            <Link
              href="/billing"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #6366F1, #F59E0B)", color: "#fff" }}
            >
              ✦ Prejsť na Enterprise
            </Link>
          </div>
        </div>
      </div>
    );
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

      {briHistory.length > 0 && (
        <div className="mt-6 border-t border-slate-800 pt-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300/70">
            🧠 Posledné BRI skóre pripravenosti
          </p>
          <ul className="space-y-2">
            {briHistory.map((row) => {
              const score = row.bri_score;
              const color = score >= 90 ? "#EF4444" : score >= 88 ? "#F59E0B" : score >= 70 ? "#6366F1" : "#64748B";
              return (
                <li key={row.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/3 px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{row.leads?.name ?? "—"}</p>
                    <p className="mt-0.5 text-[10px] italic text-slate-500 line-clamp-1">{row.reasoning_string}</p>
                  </div>
                  <span className="ml-3 shrink-0 text-sm font-bold" style={{ color }}>
                    {score}/100
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
