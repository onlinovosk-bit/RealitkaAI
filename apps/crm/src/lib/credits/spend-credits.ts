import { createServiceRoleClient } from "@/lib/supabase/admin";

export type SpendCreditsResult = {
  ok: boolean;
  skipped?: boolean;
  spent?: number;
  fromGrant?: number;
  fromPurchase?: number;
  error?: string;
};

/** Čistá logika poradia míňania — grant pool pred purchase (unit-testovateľné). */
export function computeSpendSplit(
  grantBalance: number,
  purchaseBalance: number,
  amount: number,
): { fromGrant: number; fromPurchase: number } | null {
  if (amount <= 0) return null;
  const total = grantBalance + purchaseBalance;
  if (total < amount) return null;
  const fromGrant = Math.min(grantBalance, amount);
  return { fromGrant, fromPurchase: amount - fromGrant };
}

/** Atomické míňanie cez SQL `spend_credits` (grant → purchase). */
export async function spendCredits(input: {
  agencyId: string;
  amount: number;
  reason: string;
  idempotencyKey: string;
  ref?: string | null;
}): Promise<SpendCreditsResult> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return { ok: false, error: "service_unavailable" };
  }

  const { data, error } = await supabase.rpc("spend_credits", {
    p_agency_id: input.agencyId,
    p_amount: input.amount,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
    p_ref: input.ref ?? null,
  });

  if (error) {
    console.warn("[spend-credits] rpc:", error.message);
    return { ok: false, error: error.message };
  }

  const row = data as Record<string, unknown> | null;
  if (!row) return { ok: false, error: "empty_response" };

  return {
    ok: Boolean(row.ok),
    skipped: row.skipped === true,
    spent: typeof row.spent === "number" ? row.spent : undefined,
    fromGrant: typeof row.from_grant === "number" ? row.from_grant : undefined,
    fromPurchase:
      typeof row.from_purchase === "number" ? row.from_purchase : undefined,
    error: typeof row.error === "string" ? row.error : undefined,
  };
}
