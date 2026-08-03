import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listGenerations } from "@/lib/listings/generations-store";

/** GET — posledné drafty agentúry prihláseného používateľa. */
export async function GET() {
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

  const items = await listGenerations({ agencyId: profile.agency_id as string });
  return NextResponse.json({ ok: true, items });
}
