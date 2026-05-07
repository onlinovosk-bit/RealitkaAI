import { NextResponse }  from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listProfiles }  from "@/lib/team-store";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const profiles = await listProfiles();
    return NextResponse.json({ ok: true, profiles });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
