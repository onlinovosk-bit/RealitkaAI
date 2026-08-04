import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
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
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile?.agency_id) {
    return NextResponse.json({ ok: false, error: "Chýba agency_id v profile." }, { status: 400 });
  }

  let parsed;
  try {
    parsed = editSchema.safeParse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Neplatný tvar úpravy." }, { status: 400 });
  }

  const result = await updateGenerationEdit({
    id,
    agencyId: profile.agency_id as string,
    editedOutput: parsed.data.editedOutput,
    status: parsed.data.status,
  });

  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : 500;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
