import { createServiceRoleClient } from "@/lib/supabase/admin";

/** Lead statuses that close Loop 1 open predictions (Loop 2). */
export const TERMINAL_LEAD_STATUSES = ["Uzavretý", "Stratený", "Neaktívny", "Archivovaný"] as const;

export type TerminalLeadStatus = (typeof TERMINAL_LEAD_STATUSES)[number];

export type OpenDecisionRow = {
  id: string;
  expected_value_eur: number | null;
  expected_outcome: string | null;
};

export type ExclusivityOutcomeInsert = {
  agency_id: string;
  decision_id: string;
  lead_id: string;
  outcome: string;
  outcome_value_eur: number;
};

export type OutcomeWriterClient = {
  from(table: "decisions"): {
    select(cols: string): {
      eq(col: string, val: string): {
        eq(col: string, val: string): {
          eq(col: string, val: string): Promise<{
            data: OpenDecisionRow[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
    update(row: { status: string }): {
      eq(col: string, val: string): Promise<{ error: { message: string } | null }>;
    };
  };
  from(table: "exclusivity_outcomes"): {
    insert(row: ExclusivityOutcomeInsert): {
      select(cols: string): {
        single(): Promise<{ data: { id: string } | null; error: { message: string } | null }>;
      };
    };
  };
};

export function isTerminalLeadStatus(status: string): status is TerminalLeadStatus {
  return (TERMINAL_LEAD_STATUSES as readonly string[]).includes(status);
}

/** Map CRM lead status → Genome outcome label + default EUR (won uses decision EV). */
export function mapLeadStatusToGenomeOutcome(status: string): {
  outcome: string;
  defaultValueEur: number;
} {
  switch (status) {
    case "Uzavretý":
      return { outcome: "lead_won", defaultValueEur: 0 };
    case "Stratený":
      return { outcome: "lead_lost", defaultValueEur: 0 };
    case "Neaktívny":
      return { outcome: "lead_inactive", defaultValueEur: 0 };
    case "Archivovaný":
      return { outcome: "lead_archived", defaultValueEur: 0 };
    default:
      return { outcome: "lead_closed", defaultValueEur: 0 };
  }
}

export function outcomeValueEurForDecision(
  leadStatus: string,
  decision: OpenDecisionRow,
): number {
  if (leadStatus === "Uzavretý") {
    return decision.expected_value_eur ?? 0;
  }
  return 0;
}

/**
 * Loop 2 — close open follow-up predictions when lead reaches terminal status.
 * Writes exclusivity_outcomes + marks decisions resolved.
 */
export async function resolveOpenDecisionsForLead(params: {
  leadId: string;
  agencyId: string;
  newStatus: string;
  client?: OutcomeWriterClient | null;
}): Promise<{ resolved: number; outcomeIds: string[] }> {
  const { leadId, agencyId, newStatus } = params;

  if (!isTerminalLeadStatus(newStatus)) {
    return { resolved: 0, outcomeIds: [] };
  }

  const supabase = params.client ?? (createServiceRoleClient() as OutcomeWriterClient | null);
  if (!supabase) {
    throw new Error("Supabase service role client unavailable");
  }

  const { data: openRows, error: fetchError } = await supabase
    .from("decisions")
    .select("id, expected_value_eur, expected_outcome")
    .eq("lead_id", leadId)
    .eq("agency_id", agencyId)
    .eq("status", "open");

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const openDecisions = openRows ?? [];
  if (openDecisions.length === 0) {
    return { resolved: 0, outcomeIds: [] };
  }

  const { outcome } = mapLeadStatusToGenomeOutcome(newStatus);
  const outcomeIds: string[] = [];

  for (const decision of openDecisions) {
    const { data: inserted, error: insertError } = await supabase
      .from("exclusivity_outcomes")
      .insert({
        agency_id: agencyId,
        decision_id: decision.id,
        lead_id: leadId,
        outcome,
        outcome_value_eur: outcomeValueEurForDecision(newStatus, decision),
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    const { error: updateError } = await supabase
      .from("decisions")
      .update({ status: "resolved" })
      .eq("id", decision.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (inserted?.id) outcomeIds.push(inserted.id);
  }

  return { resolved: openDecisions.length, outcomeIds };
}
