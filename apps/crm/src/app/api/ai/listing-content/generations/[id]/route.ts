import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { validateBody } from "@/lib/api-validate";
import { okResponse, errorResponse } from "@/lib/api-response";
import { incrementUsageMetric } from "@/lib/usage-metrics";
import { updateGenerationEdit } from "@/lib/listings/generations-store";

const editSchema = z.object({
  editedOutput: z.object({
    portal_text: z.string().max(20000),
    fb_ad_copy: z.string().max(5000),
    ig_caption: z.string().max(5000),
    email_subject: z.string().max(500),
    email_body: z.string().max(20000),
    seo_keywords: z.array(z.string().max(120)).max(20),
  }),
  status: z.enum(["draft", "edited", "published", "discarded"]).optional(),
});

/** PATCH — uloží ručnú úpravu textu. Pôvodný AI výstup sa NIKDY neprepisuje. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile?.agency_id) return errorResponse("Chýba agency_id v profile.", 400);

  const parsed = await validateBody(req, editSchema);
  if (!parsed.ok) return parsed.response;

  const agencyId = profile.agency_id as string;
  const result = await updateGenerationEdit({
    id,
    agencyId,
    editedOutput: parsed.data.editedOutput,
    status: parsed.data.status,
  });

  if (!result.ok) {
    return errorResponse(
      result.error === "not_found" ? "Draft sa nenašiel." : "Úpravu sa nepodarilo uložiť.",
      result.error === "not_found" ? 404 : 500,
    );
  }

  await incrementUsageMetric({ agencyId, metric: "cron_daily_match", delta: 0 });
  return okResponse({ id });
}
