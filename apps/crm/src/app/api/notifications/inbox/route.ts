import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  canViewInboxNotification,
  isInboxOwner,
} from "@/lib/notifications/inbox-access";
import type { RoutineNotificationRow } from "@/lib/notifications/store";
import { resolveProfileForAuthUser } from "@/lib/profiles/resolve-profile-for-auth";

const INBOX_LIMIT = 50;

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

  if (!profile?.agency_id || !profile.id) {
    return NextResponse.json({ ok: true, notifications: [], scope: "agent" as const });
  }

  let query = supabase
    .from("routine_notifications")
    .select("*")
    .eq("agency_id", profile.agency_id)
    .order("created_at", { ascending: false })
    .limit(INBOX_LIMIT);

  if (!isInboxOwner(profile)) {
    query = query.eq("profile_id", profile.id).neq("type", "ceo_command");
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const notifications = ((data ?? []) as RoutineNotificationRow[]).filter((row) =>
    canViewInboxNotification(profile, row),
  );

  return NextResponse.json({
    ok: true,
    notifications,
    scope: isInboxOwner(profile) ? ("owner" as const) : ("agent" as const),
  });
}
