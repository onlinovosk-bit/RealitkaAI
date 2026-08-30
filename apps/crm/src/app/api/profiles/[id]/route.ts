import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getProfileById, updateProfile } from "@/lib/team-store";

type ProfileInput = {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  teamId: string | null;
  isActive: boolean;
};

function isOwnerRole(role: string | null | undefined): boolean {
  return role === "owner" || role === "founder";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const profile = await getProfileById(id);
  if (!profile) {
    return NextResponse.json({ error: "Profil nenájdený" }, { status: 404 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles").select("agency_id").eq("auth_user_id", user.id).maybeSingle();

  if (id !== user.id) {
    // Fail-closed: missing caller agency must not read cross-tenant profiles.
    if (!callerProfile?.agency_id || profile.agencyId !== callerProfile.agency_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json({ profile });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("agency_id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const { id } = await params;

  if (id !== user.id) {
    // Fail-closed: null agency_id must not patch other profiles.
    if (!callerProfile?.agency_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const targetProfile = await getProfileById(id);
    if (targetProfile?.agencyId !== callerProfile.agency_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let body: Partial<ProfileInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Neplatný JSON" }, { status: 400 });
  }

  const wantsRoleChange = body.role !== undefined;
  const wantsActiveChange = body.isActive !== undefined;

  // Role / active flips are owner-only and go through service_role (DB trigger
  // freezes those columns for authenticated JWT clients).
  if (wantsRoleChange || wantsActiveChange) {
    if (!isOwnerRole(callerProfile?.role)) {
      return NextResponse.json(
        { error: "Zmenu role alebo aktivity môže vykonať iba majiteľ." },
        { status: 403 },
      );
    }
    // Owners must not escalate themselves via this route either.
    if (id === user.id && wantsRoleChange) {
      return NextResponse.json(
        { error: "Vlastnú rolu nie je možné meniť cez tento endpoint." },
        { status: 403 },
      );
    }
  }

  try {
    const safePatch: Partial<ProfileInput> = {
      ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
      ...(body.email !== undefined ? { email: body.email } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.teamId !== undefined ? { teamId: body.teamId } : {}),
    };

    if (wantsRoleChange || wantsActiveChange) {
      if (wantsRoleChange) safePatch.role = body.role;
      if (wantsActiveChange) safePatch.isActive = body.isActive;

      const admin = createAdminClient();
      const patch: Record<string, unknown> = {};
      if (safePatch.fullName !== undefined) patch.full_name = safePatch.fullName;
      if (safePatch.email !== undefined) patch.email = safePatch.email;
      if (safePatch.phone !== undefined) patch.phone = safePatch.phone;
      if (safePatch.teamId !== undefined) patch.team_id = safePatch.teamId;
      if (safePatch.role !== undefined) patch.role = safePatch.role;
      if (safePatch.isActive !== undefined) patch.is_active = safePatch.isActive;

      const { data, error } = await admin
        .from("profiles")
        .update(patch)
        .eq("id", id)
        .select("id, agency_id, team_id, full_name, email, role, phone, is_active")
        .single();

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        profile: {
          id: data.id,
          agencyId: data.agency_id,
          teamId: data.team_id,
          fullName: data.full_name,
          email: data.email,
          role: data.role,
          phone: data.phone,
          isActive: data.is_active,
        },
      });
    }

    const updated = await updateProfile(id, safePatch);
    return NextResponse.json({ ok: true, profile: updated });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
