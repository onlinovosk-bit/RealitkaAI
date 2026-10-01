import { CREDIT_ACTION_COSTS, type CreditActionKey } from "@/lib/program-tier-pricing";
import { spendCredits } from "@/lib/credits/spend-credits";

/**
 * Most medzi sadzobníkom a ledgerom.
 *
 * Problém, ktorý to rieši: spendCredits() bol napísaný a otestovaný, ale nemal
 * v celom repe ani jeden call site. Akcie zároveň už poznali svoju cenu —
 * posielali CREDIT_ACTION_COSTS.* do logAiAction ako pole creditsSpent, ktoré
 * sa len ZALOGOVALO do ai_action_audit. Zostatok kreditov sa nikdy nemenil,
 * takže každý AI úkon bol fakticky zadarmo.
 * Audit: docs/audit/2026-08-02-profit-leak-audit.md — nález A1
 *
 * VYNUCOVANIE JE PREDVOLENE VYPNUTÉ.
 * `CREDITS_ENFORCEMENT` = "off" (default) | "enforce"
 *   off      — kredity sa nestrhávajú, len sa vráti, koľko by sa strhlo.
 *              Umožňuje týždeň merať reálnu spotrebu bez dopadu na zákazníka.
 *   enforce  — kredity sa strhávajú a pri nedostatku sa akcia odmietne.
 *
 * Prepnutie na "enforce" je obchodné rozhodnutie foundera a má prísť až potom,
 * čo to Reality Smolko vie dopredu. Zapnutie bez ohlásenia by platiacemu
 * zákazníkovi zo dňa na deň zablokovalo funkcie, ktoré doteraz mal zadarmo.
 */
export type SpendOutcome = {
  /** true = akcia môže pokračovať */
  allowed: boolean;
  /** koľko kreditov akcia stojí podľa sadzobníka */
  cost: number;
  /** true = reálne strhnuté z ledgeru */
  charged: boolean;
  reason?: "disabled" | "no_agency" | "insufficient" | "error";
};

export function creditsEnforcementEnabled(): boolean {
  return process.env.CREDITS_ENFORCEMENT?.trim().toLowerCase() === "enforce";
}

export async function spendForAction(input: {
  action: CreditActionKey;
  agencyId: string | null | undefined;
  /** Musí byť stabilný pre ten istý logický úkon — bráni dvojitému strhnutiu pri retry. */
  idempotencyKey: string;
  ref?: string | null;
}): Promise<SpendOutcome> {
  const cost = CREDIT_ACTION_COSTS[input.action];

  if (!creditsEnforcementEnabled()) {
    return { allowed: true, cost, charged: false, reason: "disabled" };
  }
  if (!input.agencyId) {
    // Bez tenanta sa nedá účtovať. Akciu nepúšťame padnúť kvôli billingu.
    return { allowed: true, cost, charged: false, reason: "no_agency" };
  }

  const result = await spendCredits({
    agencyId: input.agencyId,
    amount: cost,
    reason: input.action,
    idempotencyKey: input.idempotencyKey,
    ref: input.ref ?? null,
  });

  if (result.ok) {
    return { allowed: true, cost, charged: !result.skipped };
  }
  if (result.error === "insufficient_credits" || result.error === "insufficient") {
    return { allowed: false, cost, charged: false, reason: "insufficient" };
  }

  // Chyba na strane billingu nesmie zablokovať produkt — zalogujeme a pustíme ďalej.
  console.warn("[spend-for-action]", input.action, result.error);
  return { allowed: true, cost, charged: false, reason: "error" };
}
