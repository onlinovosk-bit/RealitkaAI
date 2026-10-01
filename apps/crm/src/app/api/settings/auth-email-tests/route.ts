export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  emailLookupNeedsExactMatch,
  resolveProfileForAuthUser,
} from "@/lib/profiles/resolve-profile-for-auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.revolis.ai").replace(/\/$/, "");

type CallerProfile = {
  id?: string;
  agency_id?: string | null;
  auth_user_id?: string | null;
  email?: string | null;
  role?: string | null;
  ui_role?: string | null;
  account_tier?: string | null;
};

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      user: null,
      profile: null as CallerProfile | null,
      canManageUsers: false,
      error: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { profile } = await resolveProfileForAuthUser(
    supabase,
    user.id,
    "id, agency_id, auth_user_id, email, role, ui_role, account_tier",
    user.email,
  );
  const canManageUsers =
    profile?.role === "owner" ||
    profile?.role === "founder" ||
    profile?.ui_role === "owner_vision" ||
    profile?.ui_role === "owner_protocol";

  return { supabase, user, profile: (profile as CallerProfile | null) ?? null, canManageUsers, error: null };
}

/**
 * Owners may only reset passwords for users in their own agency.
 * Cross-tenant recovery (especially recovery-link returning action_link) is
 * account takeover.
 */
async function assertSameAgencyTarget(
  callerAgencyId: string | null | undefined,
  targetEmail: string,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (!callerAgencyId) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Chýba agentúra v profile — reset iného účtu nie je povolený." },
        { status: 403 },
      ),
    };
  }

  const admin = createAdminClient();
  const base = admin.from("profiles").select("id, agency_id, email");
  const { data: target, error } = emailLookupNeedsExactMatch(targetEmail)
    ? await base.eq("email", targetEmail).maybeSingle()
    : await base.ilike("email", targetEmail).maybeSingle();

  if (error) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: error.message }, { status: 500 }),
    };
  }

  if (!target?.agency_id || target.agency_id !== callerAgencyId) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Používateľ nie je v tvojej agentúre." },
        { status: 403 },
      ),
    };
  }

  return { ok: true };
}

export async function GET() {
  const { user, canManageUsers, error } = await getAuthenticatedUser();
  if (error) return error;

  return NextResponse.json({
    ok: true,
    email: user?.email ?? "",
    canManageUsers,
  });
}

export async function POST(request: Request) {
  const { supabase, user, profile, canManageUsers, error } = await getAuthenticatedUser();
  if (error) return error;
  if (!user?.email) {
    return NextResponse.json({ ok: false, error: "User email missing." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const action = String(body?.action ?? "");
    const requestedEmail = String(body?.email ?? user.email).trim().toLowerCase();
    const ownEmail = user.email.trim().toLowerCase();

    if ((action === "recovery" || action === "recovery-link") && (!requestedEmail || !requestedEmail.includes("@"))) {
      return NextResponse.json({ ok: false, error: "Zadaj platný e-mail používateľa." }, { status: 400 });
    }

    if (
      (action === "recovery" || action === "recovery-link") &&
      requestedEmail !== ownEmail &&
      !canManageUsers
    ) {
      return NextResponse.json(
        { ok: false, error: "Reset hesla iného používateľa môže vykonať iba vlastník účtu." },
        { status: 403 },
      );
    }

    if (
      (action === "recovery" || action === "recovery-link") &&
      requestedEmail !== ownEmail
    ) {
      const scope = await assertSameAgencyTarget(profile?.agency_id, requestedEmail);
      if (!scope.ok) return scope.response;
    }

    if (action === "recovery") {
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(requestedEmail, {
        redirectTo: `${APP_URL}/reset-password`,
      });

      if (recoveryError) {
        return NextResponse.json({ ok: false, error: recoveryError.message }, { status: 400 });
      }

      return NextResponse.json({
        ok: true,
        message: `E-mail s odkazom na reset hesla bol odoslaný na ${requestedEmail}.`,
      });
    }

    if (action === "recovery-link") {
      const admin = createAdminClient();
      const { data, error: linkError } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: requestedEmail,
        options: { redirectTo: `${APP_URL}/reset-password` },
      });

      if (linkError) {
        return NextResponse.json({ ok: false, error: linkError.message }, { status: 400 });
      }

      const recoveryLink = data.properties?.action_link;
      if (!recoveryLink) {
        return NextResponse.json({ ok: false, error: "Supabase nevytvoril recovery odkaz." }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        recoveryLink,
        message: `Odkaz na reset hesla pre ${requestedEmail} je pripravený.`,
      });
    }

    if (action === "invite") {
      if (!canManageUsers) {
        return NextResponse.json(
          { ok: false, error: "Pozvánky môže odosielať iba vlastník účtu." },
          { status: 403 },
        );
      }

      if (!profile?.agency_id) {
        return NextResponse.json(
          { ok: false, error: "Chýba agentúra v profile pozývajúceho." },
          { status: 403 },
        );
      }

      const testEmail = String(body?.email ?? "").trim().toLowerCase();
      const fullName = String(body?.fullName ?? "").trim() || "Testovací používateľ";

      if (!testEmail || !testEmail.includes("@")) {
        return NextResponse.json({ ok: false, error: "Zadaj validný testovací e-mail." }, { status: 400 });
      }

      const admin = createAdminClient();
      const { data, error: inviteError } = await admin.auth.admin.inviteUserByEmail(testEmail, {
        data: { full_name: fullName, role: "agent", agency_id: profile.agency_id },
        redirectTo: `${APP_URL}/dashboard`,
      });

      if (inviteError) {
        return NextResponse.json({ ok: false, error: inviteError.message }, { status: 400 });
      }

      if (!data.user?.id) {
        return NextResponse.json(
          { ok: false, error: "Pozvánka nevrátila používateľské ID." },
          { status: 500 },
        );
      }

      const { error: profileError } = await admin.from("profiles").upsert(
        {
          id: data.user.id,
          auth_user_id: data.user.id,
          agency_id: profile.agency_id,
          full_name: fullName,
          email: testEmail,
          role: "agent",
          is_active: true,
        },
        { onConflict: "id" },
      );

      if (profileError) {
        return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        message: `Pozvánka odoslaná na ${testEmail}.`,
      });
    }

    return NextResponse.json({ ok: false, error: "Unsupported action." }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Neočakávaná chyba." },
      { status: 500 },
    );
  }
}
