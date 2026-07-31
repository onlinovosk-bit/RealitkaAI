import { z } from "zod";

import { errorResponse, okResponse } from "@/lib/api-response";
import { updateGenerationStatus } from "@/lib/ai/workflow/ai-generations-store";
import { resolveAiActor } from "@/lib/ai/workflow/listing-workflow";

const patchSchema = z.object({
  action: z.enum(["copy", "edit", "publish", "save", "rate"]),
  variant: z.string().optional(),
  editedText: z.string().optional(),
  publishedTo: z.array(z.string()).optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const actor = await resolveAiActor();
  if (!actor) return errorResponse("Unauthorized", 401);

  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Neplatný vstup", 400);
  }

  const { action, variant, editedText, publishedTo, rating } = parsed.data;
  const patch: Parameters<typeof updateGenerationStatus>[2] = {};

  switch (action) {
    case "copy":
      patch.generation_status = "copied";
      patch.copied_at = new Date().toISOString();
      if (variant) patch.selected_variant = variant;
      break;
    case "edit":
      patch.generation_status = "edited";
      if (editedText != null) patch.edited_text = editedText;
      break;
    case "publish":
      patch.generation_status = "published";
      if (variant) patch.selected_variant = variant;
      if (publishedTo) patch.published_to = publishedTo;
      break;
    case "save":
      patch.generation_status = "draft";
      if (editedText != null) patch.edited_text = editedText;
      break;
    case "rate":
      if (rating == null) return errorResponse("Rating 1–5 je povinný", 400);
      patch.rating = rating;
      break;
  }

  const ok = await updateGenerationStatus(id, actor.agencyId, patch);
  if (!ok) return errorResponse("Záznam nenájdený", 404);

  return okResponse({ id, action });
}
