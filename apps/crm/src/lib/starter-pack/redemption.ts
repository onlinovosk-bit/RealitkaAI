import { createServiceRoleClient } from "@/lib/supabase/admin";
import { STARTER_PACK } from "@/lib/starter-pack/constants";

export type RedeemStarterPackResult =
  | { ok: true; creditsGranted: number; alreadyRedeemed: boolean }
  | { ok: false; error: string };

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Uplatnenie kódu → purchased kredity (neexpirujú), idempotentné. */
export async function redeemStarterPackCode(input: {
  code: string;
  agencyId: string;
}): Promise<RedeemStarterPackResult> {
  const supabase = createServiceRoleClient();
  if (!supabase) return { ok: false, error: "service_unavailable" };

  const code = normalizeCode(input.code);
  if (!code) return { ok: false, error: "invalid_code" };

  const { data: row, error: lookupErr } = await supabase
    .from("credit_redemption_codes")
    .select("id, code, value, redeemed_by_agency, redeemed_at")
    .eq("code", code)
    .maybeSingle();

  if (lookupErr || !row) return { ok: false, error: "code_not_found" };

  if (row.redeemed_by_agency) {
    if (row.redeemed_by_agency === input.agencyId) {
      return {
        ok: true,
        creditsGranted: row.value ?? STARTER_PACK.creditValue,
        alreadyRedeemed: true,
      };
    }
    return { ok: false, error: "code_already_used" };
  }

  const creditValue = row.value ?? STARTER_PACK.creditValue;
  const idempotencyKey = `starter_pack_redeem:${row.id}:${input.agencyId}`;

  const { data: existingLedger } = await supabase
    .from("credit_ledger")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingLedger) {
    return { ok: true, creditsGranted: creditValue, alreadyRedeemed: true };
  }

  const { data: agency } = await supabase
    .from("agencies")
    .select("purchased_credits_balance, grant_credits_balance, credits_balance")
    .eq("id", input.agencyId)
    .single();

  if (!agency) return { ok: false, error: "agency_not_found" };

  const purchased = (agency.purchased_credits_balance ?? 0) + creditValue;
  const grant = agency.grant_credits_balance ?? 0;
  const redeemedAt = new Date().toISOString();

  const { error: ledgerErr } = await supabase.from("credit_ledger").insert({
    agency_id: input.agencyId,
    delta: creditValue,
    reason: "starter_pack_redeem",
    ref: code,
    idempotency_key: idempotencyKey,
    source: "purchase",
  });

  if (ledgerErr) {
    console.warn("[starter-pack] redeem ledger:", ledgerErr.message);
    return { ok: false, error: "grant_failed" };
  }

  const { error: agencyErr } = await supabase
    .from("agencies")
    .update({
      purchased_credits_balance: purchased,
      credits_balance: grant + purchased,
      billing_updated_at: redeemedAt,
    })
    .eq("id", input.agencyId);

  if (agencyErr) {
    console.warn("[starter-pack] redeem agency:", agencyErr.message);
    return { ok: false, error: "grant_failed" };
  }

  const { error: codeErr } = await supabase
    .from("credit_redemption_codes")
    .update({
      redeemed_by_agency: input.agencyId,
      redeemed_at: redeemedAt,
    })
    .eq("id", row.id)
    .is("redeemed_at", null);

  if (codeErr) {
    console.warn("[starter-pack] redeem code mark:", codeErr.message);
  }

  return { ok: true, creditsGranted: creditValue, alreadyRedeemed: false };
}
