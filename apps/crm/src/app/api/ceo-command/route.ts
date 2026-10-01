import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isCeoCommandOwner } from "@/lib/ceo-command/access";
import { getCeoCommandNotifications } from "@/lib/notifications/store";
import { resolveProfileForAuthUser } from "@/lib/profiles/resolve-profile-for-auth";
import { getCeoCommandSummary } from "@/lib/ceo-command/summary";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { profile } = await resolveProfileForAuthUser(
    supabase,
    user.id,
    "id, agency_id, role, ui_role",
    user.email,
  );

  if (!isCeoCommandOwner(profile)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  if (!profile?.agency_id) {
    return NextResponse.json({ ok: true, notifications: [], summary: null });
  }

  let notifications: Awaited<ReturnType<typeof getCeoCommandNotifications>> = [];
  try {
    notifications = await getCeoCommandNotifications(profile.agency_id);
  } catch (e) {
    console.error("ceo_command notifications load failed", {
      agencyId: profile.agency_id,
      error: e instanceof Error ? e.message : String(e),
    });
    notifications = [];
  }

  try {
    const summary = await getCeoCommandSummary(supabase, profile.agency_id);
    return NextResponse.json({ ok: true, notifications, summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
