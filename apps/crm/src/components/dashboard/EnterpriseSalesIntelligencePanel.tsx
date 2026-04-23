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
      <div
        className="relative overflow-hidden rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, rgba(202,138,4,0.08) 0%, #060D1C 60%)",
          border: "1px solid rgba(234,179,8,0.25)",
        }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "#EAB308" }}>
          Protocol Authority
        </p>
        <h3 className="text-lg font-bold text-slate-100">AI Sales Intelligence</h3>
        <p className="mt-1 text-xs text-slate-500">BRI skóre · Kataster Pulse · Competition Heatmap · Neural Pulse</p>

        {/* Demo preview */}
        <div className="mt-4 space-y-2 opacity-40 pointer-events-none select-none">
          {["Novák – BRI 91/100 🔥", "Kováč – BRI 78/100 ⚡", "Horváth – BRI 65/100 📊"].map((item) => (
            <div key={item} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-400">{item}</div>
          ))}
        </div>

        {/* Upsell overlay */}
        <div className="mt-6 rounded-2xl p-5 text-center" style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.15)" }}>
          <p className="mb-1 text-sm font-black text-white">★ Dostupné v Protocol Authority</p>
          <div className="mb-4 mt-3 grid grid-cols-2 gap-1.5 text-left">
            {[
              "BRI skóre pripravenosti kúpy",
              "Hot Alert (BRI ≥ 75) — okamžite",
              "Kataster Pulse — zmeny LV",
              "Competition Heatmap",
              "Neural Pulse Engine (real-time)",
              "Ghost Resurrection — pokročilý",
              "💎 Shadow Inventory (off-market)",
              "🛡️ Agent Integrity Monitor",
              "1 owner + 4 Active Force makléri",
              "Manažérske reporty",
              "Dedikovaný Protocol manažér",
              "SLA 99.99% uptime",
            ].map((f) => (
              <div key={f} className="flex items-start gap-1.5 text-[11px] text-slate-400">
                <span className="mt-px shrink-0" style={{ color: "#EAB308" }}>✓</span>
                {f}
              </div>
            ))}
          </div>
          <Link
            href="/billing"
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-black uppercase tracking-widest transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #EAB308, #CA8A04)", color: "#010103", boxShadow: "0 0 20px rgba(234,179,8,0.25)" }}
          >
            ★ Aktivovať Protocol Authority
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "linear-gradient(135deg, rgba(202,138,4,0.10) 0%, #060D1C 60%)",
        border: "1px solid rgba(234,179,8,0.30)",
        boxShadow: "0 0 40px rgba(234,179,8,0.08)",
      }}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "#EAB308" }}>
            Protocol Authority
          </p>
          <h3 className="text-lg font-bold text-slate-100">
            AI Sales Intelligence
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            BRI skóre · Kataster Pulse · Competition Heatmap · Neural Pulse
          </p>
        </div>
        <Link
          href="/billing"
          className="text-xs font-medium underline-offset-2 hover:underline"
          style={{ color: "#EAB308" }}
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
                className="inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-80"
                style={{ background: "rgba(234,179,8,0.80)" }}
              >
                Otvoriť príležitosť
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {briHistory.length > 0 && (
        <div className="mt-6 border-t border-slate-800 pt-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: "rgba(234,179,8,0.70)" }}>
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
