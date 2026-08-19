import { createServiceRoleClient } from "@/lib/supabase/admin";
import { STARTER_PACK } from "@/lib/starter-pack/constants";

export type RedeemStarterPackResult =
  | { ok: true; creditsGranted: number; alreadyRedeemed: boolean }
  | { ok: false; error: string };

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Uplatnenie kódu → purchased kredity (neexpirujú), idempotentné.
 *
 * Poradie je zámerné: najprv atomický claim kódu (UPDATE … WHERE redeemed_at IS NULL),
 * až potom ledger/agency. Predchádzajúci grant-then-mark tok umožňoval, aby dve
 * agentúry súbežne (alebo po zlyhaní mark kroku) dostali kredity za jeden kód —
 * idempotency key obsahuje agencyId, takže ledger unikátnosť to nechytila.
 */
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
      // Claim už prebehol — dokáž kredity (retry po zlyhaní grantu).
      return finalizeCreditsForClaimedCode({
        supabase,
        codeRowId: row.id,
        code,
        agencyId: input.agencyId,
        creditValue: row.value ?? STARTER_PACK.creditValue,
      });
    }
    return { ok: false, error: "code_already_used" };
  }

  const creditValue = row.value ?? STARTER_PACK.creditValue;
  const redeemedAt = new Date().toISOString();

  // Claim FIRST — len jeden caller vyhrá pri súbehu.
  const { data: claimed, error: claimErr } = await supabase
    .from("credit_redemption_codes")
    .update({
      redeemed_by_agency: input.agencyId,
      redeemed_at: redeemedAt,
    })
    .eq("id", row.id)
    .is("redeemed_at", null)
    .select("id")
    .maybeSingle();

  if (claimErr) {
    console.warn("[starter-pack] redeem claim:", claimErr.message);
    return { ok: false, error: "grant_failed" };
  }

  if (!claimed) {
    // Niekto iný (alebo my) stihli claim — zisti výsledok.
    const { data: again } = await supabase
      .from("credit_redemption_codes")
      .select("id, value, redeemed_by_agency, redeemed_at")
      .eq("id", row.id)
      .maybeSingle();

    if (!again?.redeemed_by_agency) {
      return { ok: false, error: "grant_failed" };
    }
    if (again.redeemed_by_agency !== input.agencyId) {
      return { ok: false, error: "code_already_used" };
    }
    return finalizeCreditsForClaimedCode({
      supabase,
      codeRowId: again.id,
      code,
      agencyId: input.agencyId,
      creditValue: again.value ?? STARTER_PACK.creditValue,
    });
  }

  return finalizeCreditsForClaimedCode({
    supabase,
    codeRowId: row.id,
    code,
    agencyId: input.agencyId,
    creditValue,
  });
}

type AdminClient = NonNullable<ReturnType<typeof createServiceRoleClient>>;

async function finalizeCreditsForClaimedCode(input: {
  supabase: AdminClient;
  codeRowId: string;
  code: string;
  agencyId: string;
  creditValue: number;
}): Promise<RedeemStarterPackResult> {
  const { supabase, codeRowId, code, agencyId, creditValue } = input;
  const idempotencyKey = `starter_pack_redeem:${codeRowId}:${agencyId}`;

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
    .eq("id", agencyId)
    .single();

  if (!agency) return { ok: false, error: "agency_not_found" };

  const purchased = (agency.purchased_credits_balance ?? 0) + creditValue;
  const grant = agency.grant_credits_balance ?? 0;
  const billingUpdatedAt = new Date().toISOString();

  const { error: ledgerErr } = await supabase.from("credit_ledger").insert({
    agency_id: agencyId,
    delta: creditValue,
    reason: "starter_pack_redeem",
    ref: code,
    idempotency_key: idempotencyKey,
    source: "purchase",
  });

  if (ledgerErr) {
    // Unique violation na idempotency_key = súbeh s nami — považuj za už pripísané.
    if (/duplicate|unique/i.test(ledgerErr.message ?? "")) {
      return { ok: true, creditsGranted: creditValue, alreadyRedeemed: true };
    }
    console.warn("[starter-pack] redeem ledger:", ledgerErr.message);
    return { ok: false, error: "grant_failed" };
  }

  const { error: agencyErr } = await supabase
    .from("agencies")
    .update({
      purchased_credits_balance: purchased,
      credits_balance: grant + purchased,
      billing_updated_at: billingUpdatedAt,
    })
    .eq("id", agencyId);

  if (agencyErr) {
    console.warn("[starter-pack] redeem agency:", agencyErr.message);
    return { ok: false, error: "grant_failed" };
  }

  return {
    ok: true,
    creditsGranted: creditValue,
    alreadyRedeemed: false,
  };
}
