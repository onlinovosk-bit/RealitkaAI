"use client";

/**
 * Reference client component — Revolis dashboard patterns.
 * Mirrors ListingGeneratorForm / workdesk UI conventions.
 * NOT imported by the app; for skill documentation only.
 */

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { SLATE_HORIZON, WORKDESK_CARD, WORKDESK_INPUT } from "@/lib/slate-horizon-theme";

/** Props — explicit interface, no implicit any from destructuring */
export interface LeadQuickNoteFormProps {
  leadId: string;
  initialNote?: string;
  onSaved?: (note: string) => void;
}

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string }
  | { status: "success" };

export function LeadQuickNoteForm({
  leadId,
  initialNote = "",
  onSaved,
}: LeadQuickNoteFormProps) {
  const [note, setNote] = useState(initialNote);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();

  const isBusy = submitState.status === "submitting" || isPending;

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setNote(e.target.value);
    if (submitState.status === "error") {
      setSubmitState({ status: "idle" });
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmed = note.trim();
    if (!trimmed) {
      setSubmitState({ status: "error", message: "Poznámka nemôže byť prázdna." });
      return;
    }

    setSubmitState({ status: "submitting" });

    startTransition(async () => {
      try {
        const res = await fetch(`/api/leads/${leadId}/note`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: trimmed }),
        });

        if (!res.ok) {
          const body: unknown = await res.json().catch(() => null);
          const message =
            isErrorPayload(body) && typeof body.error === "string"
              ? body.error
              : "Uloženie zlyhalo. Skúste znova.";
          setSubmitState({ status: "error", message });
          return;
        }

        setSubmitState({ status: "success" });
        onSaved?.(trimmed);
      } catch {
        setSubmitState({
          status: "error",
          message: "Sieťová chyba. Skontrolujte pripojenie.",
        });
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-5"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: WORKDESK_CARD.borderColor,
        boxShadow: WORKDESK_CARD.boxShadow,
        borderRadius: WORKDESK_CARD.borderRadius,
        borderWidth: 1,
        borderStyle: "solid",
      }}
    >
      <label htmlFor={`note-${leadId}`} className="mb-2 block text-sm font-medium">
        <span style={{ color: SLATE_HORIZON.ink }}>Rýchla poznámka</span>
      </label>

      <textarea
        id={`note-${leadId}`}
        name="note"
        rows={3}
        value={note}
        onChange={handleChange}
        disabled={isBusy}
        className="w-full rounded-xl px-3 py-2 text-sm"
        style={{
          background: WORKDESK_INPUT.background,
          borderColor: WORKDESK_INPUT.borderColor,
          color: SLATE_HORIZON.ink,
        }}
        placeholder="Zapíšte kontext pre ďalší kontakt…"
      />

      {submitState.status === "error" && (
        <p className="mt-2 text-sm" style={{ color: SLATE_HORIZON.danger }} role="alert">
          {submitState.message}
        </p>
      )}

      {submitState.status === "success" && (
        <p className="mt-2 text-sm" style={{ color: SLATE_HORIZON.greenDark }}>
          Uložené.
        </p>
      )}

      <button
        type="submit"
        disabled={isBusy}
        className="mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        style={{ background: SLATE_HORIZON.brandDeep }}
      >
        {isBusy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Ukladám…
          </>
        ) : (
          "Uložiť poznámku"
        )}
      </button>
    </form>
  );
}

/** Type guard for API error payloads — avoids any */
function isErrorPayload(value: unknown): value is { error: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as Record<string, unknown>).error === "string"
  );
}
