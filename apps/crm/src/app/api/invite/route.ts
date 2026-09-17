export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const INVITE_ROLES = new Set(["agent", "manager", "admin"]);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, agency_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profile?.role !== "owner" && profile?.role !== "founder") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    if (!profile.agency_id) {
      return NextResponse.json(
        { ok: false, error: "Chýba agentúra v profile pozývajúceho." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
    const requestedRole = typeof body?.role === "string" ? body.role.trim() : "agent";
    const role = INVITE_ROLES.has(requestedRole) ? requestedRole : "agent";

    if (!email || !fullName) {
      return NextResponse.json({ ok: false, error: "Vyplňte meno a email." }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role, agency_id: profile.agency_id },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/dashboard`,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    if (!data.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Pozvánka nevrátila používateľské ID." },
        { status: 500 },
      );
    }

    // Must stamp agency_id — without it the invitee logs in with a profile that
    // has no tenant, so listLeads/inventory resolve to empty forever.
    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: data.user.id,
        auth_user_id: data.user.id,
        agency_id: profile.agency_id,
        full_name: fullName,
        email,
        role,
        is_active: true,
      },
      { onConflict: "id" },
    );

    if (profileError) {
      return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Pozvánka zlyhala." },
      { status: 500 },
    );
  }
}
