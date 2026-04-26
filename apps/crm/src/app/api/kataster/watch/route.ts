import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MARKET_VISION_LIMIT = 100;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile?.id) {
    return NextResponse.json({ ok: false, error: "Profile not found" }, { status: 404 });
  }

  const { count, error } = await supabase
    .from("watched_parcels")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", profile.id)
    .eq("status", "active");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    count: count ?? 0,
    marketVisionLimit: MARKET_VISION_LIMIT,
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    parcelId?: string;
    leadId?: string;
    accountTier?: "market_vision" | "authority";
  };
  const parcelId = body.parcelId?.trim();
  const accountTier = body.accountTier ?? "market_vision";

  if (!parcelId) {
    return NextResponse.json({ ok: false, error: "parcelId je povinné" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile?.id) {
    return NextResponse.json({ ok: false, error: "Profile not found" }, { status: 404 });
  }

  const { count } = await supabase
    .from("watched_parcels")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", profile.id)
    .eq("status", "active");

  if (accountTier !== "authority" && (count ?? 0) >= MARKET_VISION_LIMIT) {
    return NextResponse.json(
      { ok: false, error: "Limit Market Vision (100) bol dosiahnutý." },
      { status: 403 },
    );
  }

  const { error } = await supabase.from("watched_parcels").upsert(
    {
      profile_id: profile.id,
      lead_id: body.leadId ?? null,
      parcel_id: parcelId,
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,parcel_id" },
  );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
