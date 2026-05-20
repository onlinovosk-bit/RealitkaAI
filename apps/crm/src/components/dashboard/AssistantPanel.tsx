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
import { AI_ASSISTANT_NAME, AI_ASSISTANT_NAME_GENITIVE } from "@/lib/ai-brand";

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
          setError(data.error ?? `${AI_ASSISTANT_NAME} nie je dostupný.`);
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
    <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm shadow-slate-200/70">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-700">
            Komu volať ako prvému?
          </p>
          <h3 className="mt-1 text-lg font-extrabold tracking-tight text-slate-950">
            {AI_ASSISTANT_NAME}
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Odporúčanie pre vybranú príležitosť — bez zmeny dát v CRM.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Kontext pre AI Asistenta">
          {contexts.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={ctx === c.id}
              onClick={() => setCtx(c.id)}
              className={`min-h-9 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                ctx === c.id
                  ? "border border-blue-200 bg-blue-50 text-blue-800"
                  : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-blue-50/80"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {leadFromUrl && (
        <p className="mt-3 text-[11px] font-medium text-blue-700">
          Kontext príležitosti z odkazu (?lead=…)
        </p>
      )}

      {!leadFromUrl && leadOptions.length > 1 && (
        <label className="mt-3 block text-xs font-medium text-slate-600">
          Príležitosť
          <select
            value={effectiveLeadId ?? ""}
            onChange={(e) => setLeadAndPersist(e.target.value)}
            className="mt-1 w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          Žiadna príležitosť na analýzu. Pridaj lead do CRM alebo otvor detail s parametrom{" "}
          <code className="rounded bg-white px-1 text-amber-950">?lead=</code>.
        </p>
      )}

      {loading && effectiveLeadId && (
        <p className="mt-4 text-sm font-medium text-slate-600">
          Načítavam odpoveď {AI_ASSISTANT_NAME_GENITIVE}…
        </p>
      )}

      {showApiAnswer && (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
          {answer}
        </p>
      )}

      {showFallbackLine && (
        <>
          <p className="mt-4 text-sm leading-relaxed text-slate-800">{fallbackMessage}</p>
          {error && (
            <p className="mt-2 text-xs text-amber-800">
              API: {error} (zobrazujem záložný text.)
            </p>
          )}
        </>
      )}

      {!showApiAnswer && (
        <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-xs text-slate-600">
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
