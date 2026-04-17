"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AssistantPanelLoading } from "@/components/dashboard/AssistantPanelLoading";
import {
  assistantQuestionForContext,
  generateAssistantMessage,
  type AssistantContext,
} from "@/lib/ai/assistant-script";
import { getSalesScript } from "@/lib/sales/sales-script";
import { AI_ASSISTANT_NAME } from "@/lib/ai-brand";

const SESSION_LEAD_KEY = "assistant_panel_lead_id_v1";

const contexts: { id: AssistantContext; label: string }[] = [
  { id: "call", label: "Hovor" },
  { id: "deal", label: "Obchod" },
  { id: "default", label: "Prehľad" },
];

export type AssistantPanelProps = {
  /** Predvolený lead (napr. prvá príležitosť na dashboarde). */
  defaultLeadId?: string;
  /** Zoznam na výber v paneli (id + meno). */
  leadOptions?: { id: string; name: string }[];
};

function AssistantPanelInner({ defaultLeadId, leadOptions = [] }: AssistantPanelProps) {
  const searchParams = useSearchParams();
  const leadFromUrl =
    searchParams?.get("lead") ?? searchParams?.get("leadId") ?? null;

  const [pickedLead, setPickedLead] = useState<string | null>(null);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(SESSION_LEAD_KEY);
      if (s) setPickedLead(s);
    } catch {
      /* ignore */
    }
  }, []);

  const effectiveLeadId = useMemo(() => {
    if (leadFromUrl) return leadFromUrl;
    if (pickedLead) return pickedLead;
    if (defaultLeadId) return defaultLeadId;
    if (leadOptions[0]?.id) return leadOptions[0].id;
    return null;
  }, [leadFromUrl, pickedLead, defaultLeadId, leadOptions]);

  const setLeadAndPersist = useCallback((id: string) => {
    setPickedLead(id);
    try {
      sessionStorage.setItem(SESSION_LEAD_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const [ctx, setCtx] = useState<AssistantContext>("call");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!effectiveLeadId) {
      setAnswer(null);
      setError(null);
      setLoading(false);
      return;
    }
    const q = assistantQuestionForContext(ctx);
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    setAnswer(null);

    void fetch(`/api/leads/${effectiveLeadId}/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q }),
      signal: ac.signal,
    })
      .then(async (res) => {
        const data = (await res.json()) as {
          ok?: boolean;
          answer?: string;
          error?: string;
        };
        if (!res.ok || !data.ok || !data.answer?.trim()) {
          setError(data.error ?? "Asistent nie je dostupný.");
          return;
        }
        setAnswer(data.answer.trim());
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (e instanceof Error && e.name === "AbortError") return;
        setError("Sieťová chyba.");
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      ac.abort();
    };
  }, [effectiveLeadId, ctx]);

  const fallbackMessage = generateAssistantMessage(ctx);
  const bullets = getSalesScript().slice(1, 4);

  const showApiAnswer = Boolean(answer && !loading);
  const showFallbackLine =
    !showApiAnswer && Boolean(effectiveLeadId) && (Boolean(error) || (!loading && !answer));

  return (
    <div className="rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-950/50 via-slate-900/80 to-slate-950 p-5 text-white shadow-[0_0_24px_rgba(99,102,241,0.12)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">{AI_ASSISTANT_NAME}</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {contexts.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCtx(c.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                ctx === c.id
                  ? "bg-indigo-500/30 text-indigo-100 ring-1 ring-indigo-400/40"
                  : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {leadFromUrl && (
        <p className="mt-3 text-[11px] text-cyan-300/80">
          Kontext leadu z URL (?lead=…)
        </p>
      )}

      {!leadFromUrl && leadOptions.length > 1 && (
        <label className="mt-3 block text-xs text-slate-400">
          Príležitosť
          <select
            value={effectiveLeadId ?? ""}
            onChange={(e) => setLeadAndPersist(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-sm text-white"
          >
            {leadOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name || o.id}
              </option>
            ))}
          </select>
        </label>
      )}

      {!effectiveLeadId && (
        <p className="mt-4 text-sm text-amber-200/90">
          Žiadna príležitosť na analýzu. Pridaj lead do CRM alebo použi odkaz z detailu leadu s parametrom{" "}
          <code className="rounded bg-black/40 px-1">?lead=</code>.
        </p>
      )}

      {loading && effectiveLeadId && (
        <p className="mt-4 text-sm text-indigo-200/80">Načítavam odpoveď asistenta…</p>
      )}

      {showApiAnswer && (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-indigo-100/95">
          {answer}
        </p>
      )}

      {showFallbackLine && (
        <>
          <p className="mt-4 text-sm leading-relaxed text-indigo-100/95">{fallbackMessage}</p>
          {error && (
            <p className="mt-2 text-xs text-amber-300/90">
              API: {error} (zobrazujem záložný text.)
            </p>
          )}
        </>
      )}

      {!showApiAnswer && (
        <ul className="mt-4 space-y-1.5 border-t border-white/10 pt-4 text-xs text-slate-400">
          {bullets.map((b) => (
            <li key={b}>• {b}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AssistantPanel(props: AssistantPanelProps) {
  return (
    <Suspense fallback={<AssistantPanelLoading />}>
      <AssistantPanelInner {...props} />
    </Suspense>
  );
}
