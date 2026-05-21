"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { EnterpriseInsightRow } from "@/lib/db/enterprise-intelligence-store";
import { subscribeLeadEvents } from "@/lib/realtime/enterprise-lead-events";
import { supabaseClient } from "@/lib/supabase/client";
import { SLATE_HORIZON, WORKDESK_INNER_ROW, WORKDESK_PANEL } from "@/lib/slate-horizon-theme";

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

const panelStyle = {
  background: "linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 55%)",
  borderColor: "#FDE68A",
  boxShadow: SLATE_HORIZON.cardShadow,
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
      <div className="relative overflow-hidden rounded-[20px] border p-5" style={panelStyle}>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "#B45309" }}>
          Protocol Authority
        </p>
        <h3 className="text-lg font-bold" style={{ color: SLATE_HORIZON.ink }}>
          AI Sales Intelligence
        </h3>
        <p className="mt-1 text-xs" style={{ color: SLATE_HORIZON.muted }}>
          BRI skóre · Kataster Pulse · Competition Heatmap · Neural Pulse
        </p>

        <div className="pointer-events-none mt-4 select-none space-y-2 opacity-40">
          {["Novák – BRI 91/100", "Kováč – BRI 78/100", "Horváth – BRI 65/100"].map((item) => (
            <div
              key={item}
              className="rounded-xl border p-3 text-sm"
              style={{
                borderColor: WORKDESK_INNER_ROW.borderColor,
                background: WORKDESK_INNER_ROW.background,
                color: SLATE_HORIZON.muted,
              }}
            >
              {item}
            </div>
          ))}
        </div>

        <div
          className="mt-6 rounded-2xl border p-5 text-center"
          style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}
        >
          <p className="mb-1 text-sm font-black" style={{ color: SLATE_HORIZON.ink }}>
            ★ Dostupné v Protocol Authority
          </p>
          <div className="mb-4 mt-3 grid grid-cols-2 gap-1.5 text-left">
            {[
              "Kto je pripravený kúpiť hneď (skóre 0-100)",
              "Okamžité upozornenie na horúceho klienta",
              "Kataster naživo: hneď vidíš zmeny vlastníkov",
              "Mapa, kde konkurencia nestíha (tam sú peniaze dnes)",
              "Živý AI radar: kde sa trh hýbe práve teraz",
              "Návrat starých klientov, čo sa dlho neozvali",
              "Skryté ponuky mimo bežných portálov",
              "Ochrana tvojich dát a tímu",
              "1 majiteľ + 4 makléri v cene",
              "Jednoduché reporty: kde sme zarobili a kde unikajú peniaze",
              "Osobný Protocol manažér pre rýchlu pomoc",
              "SLA 99.99% uptime",
            ].map((f) => (
              <div key={f} className="flex items-start gap-1.5 text-[11px]" style={{ color: SLATE_HORIZON.muted }}>
                <span className="mt-px shrink-0" style={{ color: "#B45309" }}>
                  ✓
                </span>
                {f}
              </div>
            ))}
          </div>
          <Link
            href="/billing"
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-black uppercase tracking-widest transition-all hover:opacity-95"
            style={{
              background: "linear-gradient(135deg, #F59E0B, #D97706)",
              color: SLATE_HORIZON.inkDeep,
              boxShadow: "0 4px 16px rgba(245,158,11,0.2)",
            }}
          >
            ★ Aktivovať Protocol Authority
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[20px] border p-5" style={panelStyle}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "#B45309" }}>
            Protocol Authority
          </p>
          <h3 className="text-lg font-bold" style={{ color: SLATE_HORIZON.ink }}>
            AI Sales Intelligence
          </h3>
          <p className="mt-1 text-xs" style={{ color: SLATE_HORIZON.muted }}>
            BRI skóre · Kataster Pulse · Competition Heatmap · Neural Pulse
          </p>
        </div>
        <Link
          href="/billing"
          className="text-xs font-medium underline-offset-2 hover:underline"
          style={{ color: "#B45309" }}
        >
          Plány
        </Link>
      </div>

      {loading && <p className="text-sm" style={{ color: SLATE_HORIZON.muted }}>Načítavam odporúčania…</p>}
      {error && (
        <p
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: "#FECACA", background: "#FEF2F2", color: SLATE_HORIZON.danger }}
        >
          {error}
        </p>
      )}

      {!loading && !error && insights.length === 0 && (
        <p className="text-sm" style={{ color: SLATE_HORIZON.muted }}>
          Zatiaľ žiadne uložené akcie. Pridaj udalosti k leadom alebo spusti spracovanie na detaile príležitosti.
        </p>
      )}

      <ul className="mt-3 space-y-3">
        {insights.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border p-4"
            style={{
              borderColor: WORKDESK_INNER_ROW.borderColor,
              background: WORKDESK_PANEL.background,
            }}
          >
            <p className="font-semibold" style={{ color: SLATE_HORIZON.ink }}>
              {item.lead_name}
            </p>
            <p className="mt-1 text-xs" style={{ color: SLATE_HORIZON.muted }}>
              Score: {item.score ?? "—"} | Risk: {item.risk ?? "—"}
            </p>
            <p className="mt-2 text-sm" style={{ color: SLATE_HORIZON.deep }}>
              <span style={{ color: SLATE_HORIZON.brandDeep }}>→</span> {item.action}
            </p>
            <p className="mt-1 text-xs" style={{ color: SLATE_HORIZON.muted }}>
              {item.reason}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/leads/${item.lead_id}`}
                className="inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                style={{ background: SLATE_HORIZON.brandDeep }}
              >
                Otvoriť príležitosť
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {briHistory.length > 0 && (
        <div className="mt-6 border-t pt-4" style={{ borderColor: SLATE_HORIZON.line }}>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: "#B45309" }}>
            Posledné BRI skóre pripravenosti
          </p>
          <ul className="space-y-2">
            {briHistory.map((row) => {
              const score = row.bri_score;
              const color =
                score >= 90
                  ? SLATE_HORIZON.danger
                  : score >= 88
                    ? SLATE_HORIZON.warning
                    : score >= 70
                      ? SLATE_HORIZON.brandDeep
                      : SLATE_HORIZON.muted;
              return (
                <li
                  key={row.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                  style={{
                    borderColor: WORKDESK_INNER_ROW.borderColor,
                    background: WORKDESK_INNER_ROW.background,
                  }}
                >
                  <div>
                    <p className="text-xs font-semibold" style={{ color: SLATE_HORIZON.ink }}>
                      {row.leads?.name ?? "—"}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[10px] italic" style={{ color: SLATE_HORIZON.muted }}>
                      {row.reasoning_string}
                    </p>
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
