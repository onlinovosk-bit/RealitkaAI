import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { UUIDSchema } from "@/lib/api-validate";
import { canViewInboxNotification } from "@/lib/notifications/inbox-access";
import { markNotificationRead } from "@/lib/notifications/store";
import { resolveProfileForAuthUser } from "@/lib/profiles/resolve-profile-for-auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const idValidation = UUIDSchema.safeParse(id);
  if (!idValidation.success) {
    return NextResponse.json({ ok: false, error: "Invalid notification ID" }, { status: 400 });
  }

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
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { data: row } = await supabase
    .from("routine_notifications")
    .select("id, agency_id, profile_id, type")
    .eq("id", id)
    .maybeSingle();

  if (!row || row.agency_id !== profile.agency_id) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  if (!canViewInboxNotification(profile, row)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  await markNotificationRead(id);
  return NextResponse.json({ ok: true });
}
