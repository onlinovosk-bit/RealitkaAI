import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isCeoCommandOwner } from "@/lib/ceo-command/access";
import { markNotificationRead } from "@/lib/notifications/store";
import { resolveProfileForAuthUser } from "@/lib/profiles/resolve-profile-for-auth";
import { UUIDSchema } from "@/lib/api-validate";

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

  if (!isCeoCommandOwner(profile)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { data: row } = await supabase
    .from("routine_notifications")
    .select("id, agency_id, type")
    .eq("id", id)
    .maybeSingle();

  if (!row || row.type !== "ceo_command") {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  if (profile?.agency_id && row.agency_id !== profile.agency_id) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  await markNotificationRead(id);
  return NextResponse.json({ ok: true });
}
