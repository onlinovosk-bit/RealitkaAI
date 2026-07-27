import {
  LOST_REASON_CODES,
  WON_REASON_CODES,
  type DealOutcomeKind,
  isKnownLostReason,
  isKnownWonReason,
} from "@/lib/moat-capture/reason-codes";

export const DEAL_OUTCOME_TERMINAL_LEAD_STATUSES = ["Uzavretý", "Stratený"] as const;

export type DealOutcomeTerminalLeadStatus = (typeof DEAL_OUTCOME_TERMINAL_LEAD_STATUSES)[number];

export function isDealOutcomeTerminalLeadStatus(
  status: string,
): status is DealOutcomeTerminalLeadStatus {
  return (DEAL_OUTCOME_TERMINAL_LEAD_STATUSES as readonly string[]).includes(status);
}

export function dealOutcomeKindForTerminalStatus(status: DealOutcomeTerminalLeadStatus): DealOutcomeKind {
  return status === "Uzavretý" ? "won" : "lost";
}

export function reasonCodesForDealOutcome(outcome: DealOutcomeKind): readonly string[] {
  return outcome === "won" ? WON_REASON_CODES : LOST_REASON_CODES;
}

export function isReasonValidForDealOutcome(outcome: DealOutcomeKind, code: string): boolean {
  return outcome === "won" ? isKnownWonReason(code) : isKnownLostReason(code);
}
