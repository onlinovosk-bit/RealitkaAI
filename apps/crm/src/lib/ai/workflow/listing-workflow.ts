import { createClient } from "@/lib/supabase/server";
import { logAiAction } from "@/lib/ai-action-audit";
import { rateLimit } from "@/lib/rate-limit";
import { spendCredits } from "@/lib/credits/spend-credits";
import { CREDIT_ACTION_COSTS } from "@/lib/program-tier-pricing";
import {
  completeGeneration,
  findGenerationByIdempotencyKey,
  getAgencyCreditsBalance,
  insertGeneration,
  listingCreditIdempotencyKey,
  type AiGenerationRow,
} from "@/lib/ai/workflow/ai-generations-store";

export type AiActor = {
  userId: string;
  agencyId: string;
  profileId: string | null;
};

export async function resolveAiActor(): Promise<AiActor | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, agency_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile?.agency_id) return null;
  return {
    userId: user.id,
    agencyId: profile.agency_id,
    profileId: profile.id ?? null,
  };
}

const LISTING_RATE_MAX = 10;
const LISTING_RATE_WINDOW_MS = 3_600_000;

export async function checkListingRateLimit(profileId: string): Promise<string | null> {
  const { allowed } = await rateLimit(
    `ai:generate-listing:${profileId}`,
    LISTING_RATE_MAX,
    LISTING_RATE_WINDOW_MS,
  );
  if (!allowed) {
    return `Limit ${LISTING_RATE_MAX} generovaní za hodinu. Skúste neskôr.`;
  }
  return null;
}

export async function ensureListingCredits(agencyId: string): Promise<string | null> {
  const balance = await getAgencyCreditsBalance(agencyId);
  const cost = CREDIT_ACTION_COSTS.listingDescription;
  if (balance == null) return "Služba nie je dostupná.";
  if (balance < cost) {
    return `Nedostatok kreditov (potrebujete ${cost}, máte ${balance}). Doplňte v /billing.`;
  }
  return null;
}

export type ListingWorkflowContext = {
  actor: AiActor;
  idempotencyKey: string;
  existing: AiGenerationRow | null;
  generationId: string | null;
  creditKey: string;
  cost: number;
};

export async function prepareListingWorkflow(
  actor: AiActor,
  idempotencyKey: string,
  inputJson: Record<string, unknown>,
  meta: { promptVersion: string; promptHash: string; schemaVersion: string },
): Promise<
  | { ok: true; ctx: ListingWorkflowContext; cached: AiGenerationRow | null }
  | { ok: false; error: string; status: number }
> {
  const rateErr = await checkListingRateLimit(actor.profileId ?? actor.userId);
  if (rateErr) return { ok: false, error: rateErr, status: 429 };

  const existing = await findGenerationByIdempotencyKey(idempotencyKey);
  if (existing?.model_output) {
    return {
      ok: true,
      ctx: {
        actor,
        idempotencyKey,
        existing,
        generationId: existing.id,
        creditKey: listingCreditIdempotencyKey(idempotencyKey),
        cost: CREDIT_ACTION_COSTS.listingDescription,
      },
      cached: existing,
    };
  }

  const creditErr = await ensureListingCredits(actor.agencyId);
  if (creditErr) return { ok: false, error: creditErr, status: 402 };

  let generationId = existing?.id ?? null;
  if (!generationId) {
    const inserted = await insertGeneration({
      agencyId: actor.agencyId,
      profileId: actor.profileId,
      workflowType: "listing",
      inputJson,
      idempotencyKey,
      promptVersion: meta.promptVersion,
      promptHash: meta.promptHash,
      schemaVersion: meta.schemaVersion,
    });
    if (!inserted) {
      const raced = await findGenerationByIdempotencyKey(idempotencyKey);
      if (raced?.model_output) {
        return {
          ok: true,
          ctx: {
            actor,
            idempotencyKey,
            existing: raced,
            generationId: raced.id,
            creditKey: listingCreditIdempotencyKey(idempotencyKey),
            cost: CREDIT_ACTION_COSTS.listingDescription,
          },
          cached: raced,
        };
      }
      return { ok: false, error: "Konflikt idempotency. Skúste znova.", status: 409 };
    }
    generationId = inserted.id;
  }

  return {
    ok: true,
    ctx: {
      actor,
      idempotencyKey,
      existing,
      generationId,
      creditKey: listingCreditIdempotencyKey(idempotencyKey),
      cost: CREDIT_ACTION_COSTS.listingDescription,
    },
    cached: null,
  };
}

export async function finalizeListingGeneration(
  ctx: ListingWorkflowContext,
  output: Record<string, unknown>,
  audit: { model: string; costEur: number; latencyMs: number },
): Promise<{ spent: number; skipped: boolean }> {
  const spend = await spendCredits({
    agencyId: ctx.actor.agencyId,
    amount: ctx.cost,
    reason: "listing_description",
    idempotencyKey: ctx.creditKey,
    ref: ctx.generationId ?? undefined,
  });

  if (!spend.ok && !spend.skipped) {
    throw new Error(spend.error ?? "credit_spend_failed");
  }

  const creditsSpent = spend.skipped ? 0 : (spend.spent ?? ctx.cost);

  if (ctx.generationId) {
    await completeGeneration({
      id: ctx.generationId,
      modelOutput: output,
      model: audit.model,
      creditsSpent,
    });
  }

  await logAiAction({
    action: "listing_description",
    agencyId: ctx.actor.agencyId,
    profileId: ctx.actor.profileId,
    creditsSpent,
    costEur: audit.costEur,
    model: audit.model,
    latencyMs: audit.latencyMs,
    meta: { idempotencyKey: ctx.idempotencyKey, generationId: ctx.generationId },
  });

  return { spent: creditsSpent, skipped: spend.skipped === true };
}
