import { after } from "next/server";

import { errorResponse, okResponse } from "@/lib/api-response";
import { generateListingFromInput } from "@/lib/ai/generate-listing";
import {
  LISTING_PROMPT_VERSION,
  listingPromptHash,
} from "@/lib/ai/prompts/listing-prompt";
import { LISTING_OUTPUT_SCHEMA_VERSION } from "@/lib/ai/schemas/listing-output";
import { ListingInputSchema } from "@/lib/ai/schemas/listing-input";
import {
  finalizeListingGeneration,
  prepareListingWorkflow,
  resolveAiActor,
} from "@/lib/ai/workflow/listing-workflow";
import {
  isValidClientIdempotencyKey,
  newClientIdempotencyKey,
} from "@/lib/ai/workflow/ai-generations-store";
import { flushLangfuseTraces } from "@/lib/langfuse";

export async function POST(req: Request) {
  const actor = await resolveAiActor();
  if (!actor) return errorResponse("Unauthorized", 401);

  let body: { input?: unknown; idempotencyKey?: string };
  try {
    body = (await req.json()) as { input?: unknown; idempotencyKey?: string };
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const parsed = ListingInputSchema.safeParse(body.input);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Neplatný vstup", 400);
  }

  let idempotencyKey = body.idempotencyKey?.trim() ?? "";
  if (!idempotencyKey) idempotencyKey = newClientIdempotencyKey();
  if (!isValidClientIdempotencyKey(idempotencyKey)) {
    return errorResponse("Neplatný idempotencyKey (očakávaný UUID v4)", 400);
  }

  const prep = await prepareListingWorkflow(
    actor,
    idempotencyKey,
    parsed.data as Record<string, unknown>,
    {
      promptVersion: LISTING_PROMPT_VERSION,
      promptHash: listingPromptHash(),
      schemaVersion: LISTING_OUTPUT_SCHEMA_VERSION,
    },
  );

  if (!prep.ok) return errorResponse(prep.error, prep.status);

  if (prep.cached?.model_output) {
    return okResponse({
      idempotencyKey,
      generationId: prep.cached.id,
      output: prep.cached.model_output,
      cached: true,
      creditsSpent: prep.cached.credits_spent ?? 0,
    });
  }

  try {
    const { output, audit } = await generateListingFromInput(parsed.data, {
      agencyId: actor.agencyId,
      userId: actor.userId,
    });
    const { spent, skipped } = await finalizeListingGeneration(
      prep.ctx,
      output as Record<string, unknown>,
      audit,
    );

    after(async () => {
      await flushLangfuseTraces();
    });

    return okResponse({
      idempotencyKey,
      generationId: prep.ctx.generationId,
      output,
      cached: false,
      creditsSpent: spent,
      creditSkipped: skipped,
      latencyMs: audit.latencyMs,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generovanie zlyhalo";
    return errorResponse(msg, 502);
  }
}
