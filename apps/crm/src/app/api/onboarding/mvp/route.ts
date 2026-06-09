import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!profile?.agency_id) {
      return NextResponse.json({ ok: false, error: "No agency" }, { status: 404 });
    }

    const { data: progress, error } = await supabase
      .from("client_onboarding_progress")
      .select("*")
      .eq("agency_id", profile.agency_id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({
        ok: true,
        progress: null,
        message: "Onboarding data not available yet",
      });
    }

    return NextResponse.json({ ok: true, progress });
  } catch {
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
