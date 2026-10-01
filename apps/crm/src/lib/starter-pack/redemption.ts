import { createServiceRoleClient } from "@/lib/supabase/admin";
import { applyCreditPurchase } from "@/lib/credits/mutate-credits";
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
      codeRowId: again.id,
      code,
      agencyId: input.agencyId,
      creditValue: again.value ?? STARTER_PACK.creditValue,
    });
  }

  return finalizeCreditsForClaimedCode({
    codeRowId: row.id,
    code,
    agencyId: input.agencyId,
    creditValue,
  });
}

async function finalizeCreditsForClaimedCode(input: {
  codeRowId: string;
  code: string;
  agencyId: string;
  creditValue: number;
}): Promise<RedeemStarterPackResult> {
  const { codeRowId, code, agencyId, creditValue } = input;
  const idempotencyKey = `starter_pack_redeem:${codeRowId}:${agencyId}`;

  // Kód je v tomto bode už claimnutý touto agentúrou (viď redeemStarterPackCode),
  // takže tu zostáva len pripísanie kreditov. apply_credit_purchase drží riadok
  // agentúry pod FOR UPDATE a zapisuje ledger aj balance v jednej transakcii;
  // predchádzajúci tok čítal balance, pripočítal a zapísal absolútnu hodnotu, čo
  // súbežnému top-upu alebo mesačnému grantu prepísalo jeho časť. Idempotency key
  // nesie id kódu aj agencyId, takže retry po zlyhaní grantu vráti `skipped`.
  const result = await applyCreditPurchase({
    agencyId,
    amount: creditValue,
    reason: "starter_pack_redeem",
    idempotencyKey,
    ref: code,
  });

  if (!result.ok) {
    console.warn("[starter-pack] redeem credits:", result.error);
    if (result.error === "agency_not_found") {
      return { ok: false, error: "agency_not_found" };
    }
    return { ok: false, error: "grant_failed" };
  }

  return {
    ok: true,
    creditsGranted: creditValue,
    alreadyRedeemed: result.skipped === true,
  };
}
