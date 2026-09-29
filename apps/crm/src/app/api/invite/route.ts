export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { DB_ROLES, type DbRole } from "@/lib/role-config";

// Which roles an invite may hand out. Deliberately excludes the roles
// role-config.ts marks legacy (founder, admin, senior): `role` arrives in the
// request body, so anything accepted here is a role the caller can mint for
// someone else. `founder` in particular is checked by the owner gate below —
// accepting it from the body would let an owner mint a peer who outranks them.
const INVITABLE_ROLES: readonly DbRole[] = [
  DB_ROLES.OWNER,
  DB_ROLES.MANAGER,
  DB_ROLES.AGENT,
];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("role, agency_id").eq("auth_user_id", user.id).single();
    if (profile?.role !== "owner" && profile?.role !== "founder") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Fail closed. An invite writes a row into ONE agency; a caller whose own
    // profile names no agency has none to invite into.
    if (!profile.agency_id) {
      return NextResponse.json(
        { ok: false, error: "Váš profil nemá priradenú agentúru." },
        { status: 403 },
      );
    }

    const { email, fullName, role } = await request.json();

    if (!email || !fullName) {
      return NextResponse.json({ ok: false, error: "Vyplňte meno a email." }, { status: 400 });
    }

    const requestedRole: DbRole = role ?? DB_ROLES.AGENT;
    if (!INVITABLE_ROLES.includes(requestedRole)) {
      return NextResponse.json(
        { ok: false, error: "Neplatná rola." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // `profiles.email` is unique across the whole table, not per agency. Without
    // this check the upsert below would move an existing profile — including one
    // belonging to a different agency — into the caller's, by invite alone.
    const { data: existing } = await admin
      .from("profiles").select("agency_id").eq("email", email).maybeSingle();
    if (existing && existing.agency_id !== profile.agency_id) {
      return NextResponse.json(
        { ok: false, error: "Tento email už patrí inej agentúre." },
        { status: 409 },
      );
    }

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role: requestedRole },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/dashboard`,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    // `agency_id` is NOT NULL in the schema and `auth_user_id` is what every
    // lookup resolves a caller by (`.eq("auth_user_id", user.id)`). The previous
    // upsert supplied neither, and put the AUTH user id into `id` — the profile
    // table's own generated primary key. So it could not insert at all, and the
    // error was discarded: the route answered `ok: true` while creating nothing.
    const { error: profileError } = await admin.from("profiles").upsert({
      agency_id: profile.agency_id,
      auth_user_id: data.user.id,
      full_name: fullName,
      email,
      role: requestedRole,
      is_active: true,
    }, { onConflict: "email" });

    // The invite email is already out at this point. Saying `ok: true` here is
    // what hid the bug: the colleague accepts, logs in, and has no profile.
    if (profileError) {
      return NextResponse.json(
        { ok: false, error: `Pozvánka odoslaná, ale profil sa nevytvoril: ${profileError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Pozvánka zlyhala." },
      { status: 500 }
    );
  }
}
