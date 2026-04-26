import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    lat?: number;
    lng?: number;
    city?: string;
    propertyType?: string;
    searchWeight?: number;
  };

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ ok: false, error: "lat/lng sú povinné." }, { status: 400 });
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

  const { error } = await supabase.from("demand_signals").insert({
    profile_id: profileId,
    lat,
    lng,
    city: body.city?.trim() || null,
    property_type: body.propertyType?.trim() || null,
    search_weight: Number.isFinite(body.searchWeight as number) ? Math.max(0.2, Number(body.searchWeight)) : 1.0,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
