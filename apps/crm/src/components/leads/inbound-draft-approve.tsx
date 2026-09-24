"use client";

import { useState } from "react";
import type { InboundDraftView } from "@/lib/inbound/draft-view";

type Props = {
  leadId: string;
  activityId: string;
  draft: InboundDraftView;
};

/**
 * Tier-3 approval control for an inbound AI reply draft.
 * The broker sees recipient + subject and confirms; the server sends the
 * stored text verbatim (`/api/leads/:id/drafts/:activityId/approve`).
 */
export function InboundDraftApprove({ leadId, activityId, draft }: Props) {
  const [state, setState] = useState<InboundDraftView["state"] | "locked">(draft.state);
  const [error, setError] = useState<string | null>(draft.lastError ?? null);
  const [busy, setBusy] = useState(false);

  if (state === "sent") {
    return <p className="mt-1 text-xs font-medium text-emerald-700">✓ Odoslané na {draft.recipient}</p>;
  }
  if (state === "locked") {
    return <p className="mt-1 text-xs text-gray-500">{error ?? "Návrh už spracoval niekto iný."}</p>;
  }
  if (state === "sending") {
    return <p className="mt-1 text-xs text-gray-500">Odosiela sa…</p>;
  }
  if (!draft.canApprove) {
    return <p className="mt-1 text-xs text-gray-500">Návrh nemá uložený text — odpovedzte ručne.</p>;
  }

  async function approve() {
    const ok = window.confirm(
      `Odoslať tento e-mail?\n\nKomu: ${draft.recipient}\nPredmet: ${draft.subject}\n\nText sa odošle presne tak, ako je zobrazený.`,
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/drafts/${activityId}/approve`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setState("sent");
      } else if (res.status === 409) {
        // Someone else already sent or is sending it — show the server's word, never retry.
        setState("locked");
        setError(data.error ?? null);
      } else {
        setState("send_failed");
        setError(data.error ?? "Odoslanie zlyhalo.");
      }
    } catch {
      setState("send_failed");
      setError("Sieťová chyba — skúste znova.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-xs text-amber-700">
        Neodoslané · komu: <span className="font-medium">{draft.recipient}</span>
      </span>
      <button
        type="button"
        onClick={approve}
        disabled={busy}
        className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {busy ? "Odosiela sa…" : state === "send_failed" ? "Skúsiť znova odoslať" : "Schváliť a odoslať"}
      </button>
      {error && <span className="w-full text-xs text-red-600">{error}</span>}
    </div>
  );
}
