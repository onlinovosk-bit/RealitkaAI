import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!profile) return NextResponse.json({ ok: false, error: "Profil sa nenašiel." }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ ok: false, error: "Názov kampane je povinný." }, { status: 400 });

    const { data: campaign, error } = await supabase
      .from("outreach_campaigns")
      .insert({
        profile_id:  profile.id,
        name,
        segment_id:  body.segmentId  ?? null,
        template_id: body.templateId ?? null,
        status:      "draft",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, campaign }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Nepodarilo sa uložiť kampaň." },
      { status: 500 }
    );
  }
}
