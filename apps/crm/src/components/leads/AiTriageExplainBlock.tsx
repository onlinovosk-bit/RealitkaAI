"use client";

import { useState } from "react";

import {
  buildBrokerTriageBullets,
  isAiTriageFallbackReason,
  priorityEmoji,
  summarizeAiReasonForBroker,
} from "@/components/leads/ai-triage-explain-utils";
import { AI_PRIORITY_SK } from "@/lib/workflows/lead-ai-priority";

function TriageFeedbackPrompt({ leadId }: { leadId: string }) {
  const [sent, setSent] = useState<"up" | "down" | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(helpful: boolean) {
    setBusy(true);
    try {
      const res = await fetch("/api/ai/triage-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, helpful }),
      });
      if (res.ok) {
        setSent(helpful ? "up" : "down");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/10 pt-2">
      <span className="text-[10px] text-slate-500">Sedí táto priorita?</span>
      {sent ? (
        <span className="text-[10px] text-slate-400">
          {sent === "up" ? "Ďakujeme — zaznamenané." : "Ďakujeme — upravíme model."}
        </span>
      ) : (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => void send(true)}
            className="rounded-md border border-white/10 bg-slate-900/80 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            Áno
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void send(false)}
            className="rounded-md border border-white/10 bg-slate-900/80 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            Nie
          </button>
        </>
      )}
    </div>
  );
}
function badgeClasses(priority: string | null | undefined): string {
  if (priority === "Vysoká") return "bg-red-500/15 text-red-200 border-red-500/30";
  if (priority === "Nízka") return "bg-slate-500/15 text-slate-300 border-slate-500/25";
  return "bg-amber-500/12 text-amber-100 border-amber-500/25";
}

export default function AiTriageExplainBlock({
  priority,
  reason,
  status,
  budget,
  lastContact,
  triagedAt,
  leadId,
  variant = "card",
}: {
  priority: string | null | undefined;
  reason: string | null | undefined;
  status: string;
  budget: string;
  lastContact: string;
  triagedAt?: string | null;
  /** Ak je zadané, zobrazí sa rýchla spätná väzba k triáži (pre dôveru v AI). */
  leadId?: string | null;
  variant?: "card" | "compact";
}) {
  const p = priority && AI_PRIORITY_SK.includes(priority as (typeof AI_PRIORITY_SK)[number])
    ? priority
    : "Stredná";
  const bullets = buildBrokerTriageBullets({ status, budget, lastContact });
  const reasonShort = summarizeAiReasonForBroker(reason);
  const fallback = isAiTriageFallbackReason(reason);

  if (variant === "compact") {
    return (
      <div className="mt-2 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badgeClasses(p)}`}
          >
            <span aria-hidden>{priorityEmoji(p)}</span>
            {p}
          </span>
          {fallback ? (
            <span
              className="rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-100"
              title="Priorita vypočítaná záložným skórovaním (AI výstup nebol spoľahlivý)."
            >
              Záložné skóre
            </span>
          ) : null}
        </div>
        <ul className="list-inside list-disc text-[11px] text-slate-400">
          {bullets.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {reasonShort ? (
          <p className="text-[11px] leading-snug text-slate-500">
            <span className="font-medium text-slate-400">Poznámka AI:</span> {reasonShort}
          </p>
        ) : null}
        {triagedAt ? (
          <p className="text-[10px] text-slate-600">
            Triáž: {new Date(triagedAt).toLocaleString("sk-SK")}
          </p>
        ) : null}
        {leadId ? <TriageFeedbackPrompt leadId={leadId} /> : null}
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border p-4 md:p-5"
      style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
    >
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#475569" }}>
        AI priorita dnes
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${badgeClasses(p)}`}
        >
          <span className="text-base" aria-hidden>
            {priorityEmoji(p)}
          </span>
          {p} priorita
        </span>
        {fallback ? (
          <span className="rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-100">
            Záložné skóre
          </span>
        ) : (
          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-1 text-[11px] text-cyan-100/90">
            AI výstup
          </span>
        )}
      </div>
      <ul className="mt-3 space-y-1.5 text-sm" style={{ color: "#94A3B8" }}>
        {bullets.map((line) => (
          <li key={line} className="flex gap-2">
            <span style={{ color: "#22D3EE" }}>→</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      {reasonShort ? (
        <p className="mt-3 text-xs leading-relaxed border-t pt-3" style={{ borderColor: "#0F1F3D", color: "#CBD5E1" }}>
          <span className="font-semibold text-slate-400">Stručne:</span> {reasonShort}
        </p>
      ) : null}
      {triagedAt ? (
        <p className="mt-2 text-[11px]" style={{ color: "#475569" }}>
          Naposledy triáž: {new Date(triagedAt).toLocaleString("sk-SK")}
        </p>
      ) : (
        <p className="mt-2 text-[11px]" style={{ color: "#475569" }}>
          Ešte bez automatickej triáže.
        </p>
      )}
      {leadId ? <TriageFeedbackPrompt leadId={leadId} /> : null}
    </div>
  );
}
