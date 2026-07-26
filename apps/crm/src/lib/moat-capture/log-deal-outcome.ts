import { createServiceRoleClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/logger";
import {
  DEAL_OUTCOMES_TABLE,
  isMoatCaptureEnabled,
} from "@/lib/moat-capture/capture-config";
import {
  type DealOutcomeKind,
  UNSPECIFIED_REASON_CODE,
} from "@/lib/moat-capture/reason-codes";

export type LogDealOutcomeInput = {
  agencyId: string;
  leadId: string;
  outcome: DealOutcomeKind;
  reasonCode?: string;
  reasonText?: string | null;
  negotiationNote?: string | null;
  timeToCloseDays?: number | null;
  agentId?: string | null;
  propertyType?: string | null;
  location?: string | null;
  price?: number | null;
  closedAt?: string;
};

export type DealOutcomeSupabase = {
  from(table: typeof DEAL_OUTCOMES_TABLE): {
    insert(row: Record<string, unknown>): Promise<{ error: { message: string } | null }>;
  };
};

/** CRM pipeline terminal statuses → moat won/lost. */
export function mapLeadStatusToDealOutcome(status: string): DealOutcomeKind | null {
  if (status === "Uzavretý") return "won";
  if (status === "Stratený") return "lost";
  return null;
}

export async function insertDealOutcomeRow(
  input: LogDealOutcomeInput,
  client?: DealOutcomeSupabase | null,
): Promise<void> {
  const supabase = client ?? (createServiceRoleClient() as DealOutcomeSupabase | null);
  if (!supabase) return;

  const reasonCode = (input.reasonCode?.trim() || UNSPECIFIED_REASON_CODE).slice(0, 64);

  const { error } = await supabase.from(DEAL_OUTCOMES_TABLE).insert({
    agency_id: input.agencyId,
    lead_id: input.leadId,
    outcome: input.outcome,
    reason_code: reasonCode,
    reason_text: input.reasonText ?? null,
    negotiation_note: input.negotiationNote ?? null,
    time_to_close_days: input.timeToCloseDays ?? null,
    agent_id: input.agentId ?? null,
    property_type: input.propertyType ?? null,
    location: input.location ?? null,
    price: input.price ?? null,
    closed_at: input.closedAt ?? new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Fire-and-forget deal close capture.
 * TODO(PR-B2): replace UNSPECIFIED reason_code with modal-selected reason_code.
 */
export function logDealOutcome(input: LogDealOutcomeInput): void {
  if (!isMoatCaptureEnabled()) return;

  void (async () => {
    try {
      await insertDealOutcomeRow(input);
    } catch (err) {
      logError("[moat-capture] logDealOutcome failed", {
        leadId: input.leadId,
        outcome: input.outcome,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  })();
}

export function parseBudgetToPrice(budget: string | null | undefined): number | null {
  if (!budget) return null;
  const digits = String(budget).replace(/[^\d]/g, "");
  if (!digits) return null;
  const value = Number(digits);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function daysBetweenIso(startIso: string | null | undefined, endMs = Date.now()): number | null {
  if (!startIso) return null;
  const start = Date.parse(startIso);
  if (Number.isNaN(start)) return null;
  return Math.max(0, Math.floor((endMs - start) / (1000 * 60 * 60 * 24)));
}
