"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { DraftAction } from "@/lib/agents/followup/types";
import type { FollowupPreviewResult } from "@/lib/agents/followup/preview";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

const CHANNEL_LABEL: Record<string, string> = {
  email: "E-mail",
  sms: "SMS",
  none: "—",
};

function channelBadge(channel: DraftAction["channel"]) {
  if (channel === "email") return "bg-sky-100 text-sky-800";
  if (channel === "sms") return "bg-emerald-100 text-emerald-800";
  return "bg-slate-100 text-slate-600";
}

export function FollowupDraftsPanel() {
  const [data, setData] = useState<FollowupPreviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/followup", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Nepodarilo sa načítať drafty.");
        setData(null);
        return;
      }
      setData(json as FollowupPreviewResult);
    } catch {
      setError("Sieťová chyba pri načítaní draftov.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div
          className="rounded-2xl border p-5"
          style={{
            background: WORKDESK_CARD.background,
            borderColor: WORKDESK_CARD.borderColor,
            boxShadow: WORKDESK_CARD.boxShadow,
          }}
        >
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: SLATE_HORIZON.muted }}>
            Draft režim
          </p>
          <p className="mt-2 text-2xl font-bold" style={{ color: SLATE_HORIZON.ink }}>
            Náhľad
          </p>
          <p className="mt-1 text-sm text-slate-600">Žiadne odoslanie — schválenie cez Guardian (TODO).</p>
        </div>

        <div
          className="rounded-2xl border p-5"
          style={{
            background: WORKDESK_CARD.background,
            borderColor: WORKDESK_CARD.borderColor,
            boxShadow: WORKDESK_CARD.boxShadow,
          }}
        >
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: SLATE_HORIZON.muted }}>
            Drafty na schválenie
          </p>
          <p className="mt-2 text-2xl font-bold" style={{ color: SLATE_HORIZON.ink }}>
            {loading ? "…" : (data?.drafts.length ?? 0)}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {loading ? "Načítavam…" : `${data?.scanned ?? 0} skenovaných leadov`}
          </p>
        </div>

        <div
          className="rounded-2xl border p-5"
          style={{
            background: WORKDESK_CARD.background,
            borderColor: WORKDESK_CARD.borderColor,
            boxShadow: WORKDESK_CARD.boxShadow,
          }}
        >
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: SLATE_HORIZON.muted }}>
            KPI 24h kontakt
          </p>
          <p className="mt-2 text-2xl font-bold" style={{ color: SLATE_HORIZON.ink }}>
            {loading ? "…" : `${data?.kpi.percentWithin24h ?? 0}%`}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {data?.kpi.contactedWithin24h ?? 0} / {data?.kpi.totalLeads ?? 0} leadov
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Cron agent zapisuje predikcie cez POST; tento panel je len read-only náhľad.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          Obnoviť
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {!loading && !error && data && data.drafts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-slate-900">Žiadne drafty na schválenie</p>
          <p className="mt-2 text-sm text-slate-600">
            Všetky otvorené leady majú čerstvý kontakt alebo čakajú na manuálny krok.
          </p>
        </div>
      ) : null}

      <ul className="space-y-3">
        {(data?.drafts ?? []).map((draft) => {
          const open = expandedId === draft.leadId;
          return (
            <li
              key={draft.leadId}
              className="rounded-2xl border bg-white shadow-sm"
              style={{ borderColor: SLATE_HORIZON.line }}
            >
              <button
                type="button"
                className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
                onClick={() => setExpandedId(open ? null : draft.leadId)}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-slate-900">{draft.leadName}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${channelBadge(draft.channel)}`}>
                      {CHANNEL_LABEL[draft.channel] ?? draft.channel}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{draft.reason}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-slate-400">{open ? "Skryť" : "Detail"}</span>
              </button>

              {open ? (
                <div className="border-t px-5 py-4" style={{ borderColor: SLATE_HORIZON.line }}>
                  {draft.subject ? (
                    <p className="mb-2 text-sm">
                      <span className="font-semibold text-slate-700">Predmet: </span>
                      {draft.subject}
                    </p>
                  ) : null}
                  <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-800">{draft.body}</pre>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Link
                      href={`/leads/${draft.leadId}`}
                      className="text-sm font-semibold"
                      style={{ color: SLATE_HORIZON.brandDeep }}
                    >
                      Otvoriť lead →
                    </Link>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
