"use client";

import { useCallback, useEffect, useState } from "react";

type Props = {
  leadId: string;
  onDone?: () => void;
};

/**
 * Enterprise: uloží Deal Moment / Risk / DNA / AI akciu cez /api/ai/process-lead.
 */
export default function EnterpriseAiProcessButton({ leadId, onDone }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/billing/plan");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.enterpriseSalesIntelligence) setEnabled(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const run = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/ai/process-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error ?? "Spracovanie zlyhalo.");
        return;
      }
      setMsg(
        `Hot moment: ${data.isHot ? "áno" : "nie"} · skóre ${data.score} · risk ${data.risk} · ${data.action?.action}`
      );
      onDone?.();
    } catch {
      setMsg("Chyba siete.");
    } finally {
      setLoading(false);
    }
  }, [leadId, onDone]);

  if (!enabled) return null;

  return (
    <div className="rounded-2xl border border-violet-500/30 bg-violet-950/25 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-200/90">
        Enterprise AI
      </p>
      <p className="mt-1 text-xs text-violet-100/70">
        Deal Moment, riziko, Client DNA a navrhovaná akcia sa uložia do CRM.
      </p>
      <button
        type="button"
        disabled={loading}
        onClick={() => void run()}
        className="mt-2 w-full rounded-lg border border-violet-400/40 bg-violet-600/80 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
      >
        {loading ? "Spracovávam…" : "Spustiť Enterprise AI pipeline"}
      </button>
      {msg && <p className="mt-2 text-xs text-violet-100/90">{msg}</p>}
    </div>
  );
}
