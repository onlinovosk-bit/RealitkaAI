import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    fullName?: string;
    email?: string;
    phone?: string;
    location?: string;
  };

  const location = body.location?.trim();
  if (!location) {
    return NextResponse.json({ ok: false, error: "Lokalita je povinná." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // RLS on bsm_reforma_leads requires the row to carry the caller's own
  // profile_id (20260925140000), so a lead we cannot attribute can no longer be
  // written at all. Say that, rather than letting the policy denial surface as
  // a generic "Interná chyba servera".
  if (!profile?.id) {
    return NextResponse.json(
      { ok: false, error: "K vášmu kontu sa nenašiel profil. Odhláste sa a prihláste znova." },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("bsm_reforma_leads").insert({
    profile_id: profile.id,
    full_name: body.fullName?.trim() || null,
    email: body.email?.trim() || null,
    phone: body.phone?.trim() || null,
    location_text: location,
    source: "bsm_reforma_landing",
  });

  if (error) {
    const isClientError = error.message.includes("invalid") || error.message.includes("required");
    return NextResponse.json(
      { ok: false, error: isClientError ? error.message : "Interná chyba servera." },
      { status: isClientError ? 400 : 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
