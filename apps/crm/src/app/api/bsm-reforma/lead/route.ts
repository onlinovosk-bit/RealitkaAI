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

  let profileId: string | null = null;
  if (user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    profileId = profile?.id ?? null;
  }

  const { error } = await supabase.from("bsm_reforma_leads").insert({
    profile_id: profileId,
    full_name: body.fullName?.trim() || null,
    email: body.email?.trim() || null,
    phone: body.phone?.trim() || null,
    location_text: location,
    source: "bsm_reforma_landing",
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
