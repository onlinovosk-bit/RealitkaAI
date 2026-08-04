import { createServiceRoleClient } from "@/lib/supabase/admin";

export type CreditMutationResult = {
  ok: boolean;
  skipped?: boolean;
  credited?: number;
  granted?: number;
  expired?: number;
  error?: string;
};

function parseRpcRow(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null;
  return data as Record<string, unknown>;
}

/** Atomické pripísanie purchased kreditov (top-up / starter pack). */
export async function applyCreditPurchase(input: {
  agencyId: string;
  amount: number;
  reason: string;
  idempotencyKey: string;
  ref?: string | null;
}): Promise<CreditMutationResult> {
  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "service_unavailable" };

  const { data, error } = await supabase.rpc("apply_credit_purchase", {
    p_agency_id: input.agencyId,
    p_amount: input.amount,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
    p_ref: input.ref ?? null,
  });

  if (error) {
    console.warn("[mutate-credits] apply_credit_purchase:", error.message);
    return { ok: false, error: error.message };
  }

  const row = parseRpcRow(data);
  if (!row) return { ok: false, error: "empty_response" };

  return {
    ok: Boolean(row.ok),
    skipped: row.skipped === true,
    credited: typeof row.credited === "number" ? row.credited : undefined,
    error: typeof row.error === "string" ? row.error : undefined,
  };
}

/** Atomický mesačný grant (FOR UPDATE — neprepíše súbežný top-up). */
export async function applyMonthlyGrantCredits(input: {
  agencyId: string;
  amount: number;
  periodKey: string;
  idempotencyKey: string;
}): Promise<CreditMutationResult> {
  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "service_unavailable" };

  const { data, error } = await supabase.rpc("apply_monthly_grant_credits", {
    p_agency_id: input.agencyId,
    p_amount: input.amount,
    p_period_key: input.periodKey,
    p_idempotency_key: input.idempotencyKey,
  });

  if (error) {
    console.warn("[mutate-credits] apply_monthly_grant_credits:", error.message);
    return { ok: false, error: error.message };
  }

  const row = parseRpcRow(data);
  if (!row) return { ok: false, error: "empty_response" };

  return {
    ok: Boolean(row.ok),
    skipped: row.skipped === true,
    granted: typeof row.granted === "number" ? row.granted : undefined,
    error: typeof row.error === "string" ? row.error : undefined,
  };
}

/** Atomická expirácia grant poolu — credits_balance = aktuálny purchased pod zámkom. */
export async function expireGrantCreditsAtomic(input: {
  agencyId: string;
  periodKey: string;
  idempotencyKey: string;
}): Promise<CreditMutationResult> {
  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "service_unavailable" };

  const { data, error } = await supabase.rpc("expire_grant_credits", {
    p_agency_id: input.agencyId,
    p_period_key: input.periodKey,
    p_idempotency_key: input.idempotencyKey,
  });

  if (error) {
    console.warn("[mutate-credits] expire_grant_credits:", error.message);
    return { ok: false, error: error.message };
  }

  const row = parseRpcRow(data);
  if (!row) return { ok: false, error: "empty_response" };

  return {
    ok: Boolean(row.ok),
    skipped: row.skipped === true,
    expired: typeof row.expired === "number" ? row.expired : undefined,
    error: typeof row.error === "string" ? row.error : undefined,
  };
}
