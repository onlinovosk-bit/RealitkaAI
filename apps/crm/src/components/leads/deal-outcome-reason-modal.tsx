"use client";

import { useCallback, useState } from "react";
import { X } from "lucide-react";
import {
  SLATE_HORIZON,
  WORKDESK_INPUT,
  WORKDESK_PANEL,
} from "@/lib/slate-horizon-theme";
import type { DealOutcomeKind } from "@/lib/moat-capture/reason-codes";
import { reasonCodesForDealOutcome } from "@/lib/moat-capture/deal-outcome-reason";
import { labelForReasonCode } from "@/lib/moat-capture/reason-code-labels";

export type DealOutcomeReasonModalProps = {
  open: boolean;
  outcome: DealOutcomeKind;
  leadName: string;
  onConfirm: (reasonCode: string, reasonText: string) => void;
  onCancel: () => void;
};

export function DealOutcomeReasonModal({
  open,
  outcome,
  leadName,
  onConfirm,
  onCancel,
}: DealOutcomeReasonModalProps) {
  const [reasonCode, setReasonCode] = useState("");
  const [reasonText, setReasonText] = useState("");

  const codes = reasonCodesForDealOutcome(outcome);
  const title = outcome === "won" ? "Uzavretý obchod" : "Stratená príležitosť";
  const subtitle =
    outcome === "won"
      ? "Vyberte hlavný dôvod úspechu — povinné pre štatistiku agentúry."
      : "Vyberte hlavný dôvod straty — povinné pre štatistiku agentúry.";

  const resetAndClose = useCallback(() => {
    setReasonCode("");
    setReasonText("");
    onCancel();
  }, [onCancel]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reasonCode) return;
    onConfirm(reasonCode, reasonText.trim());
    setReasonCode("");
    setReasonText("");
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.45)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="deal-outcome-modal-title"
      data-testid="deal-outcome-reason-modal"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border p-6"
        style={{
          background: WORKDESK_PANEL.background,
          borderColor: WORKDESK_PANEL.borderColor,
          boxShadow: WORKDESK_PANEL.boxShadow,
        }}
      >
        <button
          type="button"
          onClick={resetAndClose}
          className="absolute right-4 top-4 rounded-lg p-1 hover:bg-slate-100"
          aria-label="Zavrieť"
        >
          <X className="h-4 w-4" style={{ color: SLATE_HORIZON.muted }} />
        </button>

        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: SLATE_HORIZON.brandDeep }}>
          {title}
        </p>
        <h2 id="deal-outcome-modal-title" className="mt-2 text-lg font-bold" style={{ color: SLATE_HORIZON.ink }}>
          {leadName}
        </h2>
        <p className="mt-1 text-sm" style={{ color: SLATE_HORIZON.muted }}>
          {subtitle}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="deal-outcome-reason-code"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide"
              style={{ color: SLATE_HORIZON.muted }}
            >
              Dôvod *
            </label>
            <select
              id="deal-outcome-reason-code"
              required
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              data-testid="deal-outcome-reason-select"
              className="w-full rounded-xl border px-3 py-2.5 text-sm font-medium outline-none min-h-[44px]"
              style={{
                background: WORKDESK_INPUT.background,
                borderColor: WORKDESK_INPUT.borderColor,
                color: SLATE_HORIZON.brandDeep,
              }}
            >
              <option value="">— vyberte —</option>
              {codes.map((code) => (
                <option key={code} value={code}>
                  {labelForReasonCode(code)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="deal-outcome-reason-text"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide"
              style={{ color: SLATE_HORIZON.muted }}
            >
              Poznámka (voliteľné)
            </label>
            <textarea
              id="deal-outcome-reason-text"
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              rows={3}
              maxLength={2000}
              data-testid="deal-outcome-reason-text"
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none resize-none"
              style={{
                background: WORKDESK_INPUT.background,
                borderColor: WORKDESK_INPUT.borderColor,
                color: SLATE_HORIZON.ink,
              }}
              placeholder="Krátky kontext pre tím…"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={resetAndClose}
              className="rounded-xl border px-4 py-2.5 text-sm font-medium min-h-[44px]"
              style={{ borderColor: WORKDESK_INPUT.borderColor, color: SLATE_HORIZON.muted }}
            >
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={!reasonCode}
              data-testid="deal-outcome-reason-submit"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white min-h-[44px] disabled:opacity-50"
              style={{ background: SLATE_HORIZON.brandDeep }}
            >
              Potvrdiť uzavretie
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
