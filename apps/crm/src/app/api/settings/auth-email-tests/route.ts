export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { resolveProfileForAuthUser } from "@/lib/profiles/resolve-profile-for-auth";
import { getPasswordRecoveryRedirectUrl } from "@/lib/supabase/recovery-redirect";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.revolis.ai").replace(/\/$/, "");
const RECOVERY_REDIRECT = getPasswordRecoveryRedirectUrl(APP_URL);

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      user: null,
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

  return { supabase, user, canManageUsers, error: null };
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
  const { supabase, user, canManageUsers, error } = await getAuthenticatedUser();
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

    if (action === "recovery") {
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(requestedEmail, {
        redirectTo: RECOVERY_REDIRECT,
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
        options: { redirectTo: RECOVERY_REDIRECT },
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

      const testEmail = String(body?.email ?? "").trim().toLowerCase();
      const fullName = String(body?.fullName ?? "").trim() || "Testovací používateľ";

      if (!testEmail || !testEmail.includes("@")) {
        return NextResponse.json({ ok: false, error: "Zadaj validný testovací e-mail." }, { status: 400 });
      }

      const admin = createAdminClient();
      const { data, error: inviteError } = await admin.auth.admin.inviteUserByEmail(testEmail, {
        data: { full_name: fullName, role: "agent" },
        redirectTo: `${APP_URL}/dashboard`,
      });

      if (inviteError) {
        return NextResponse.json({ ok: false, error: inviteError.message }, { status: 400 });
      }

      if (data.user?.id) {
        await admin.from("profiles").upsert(
          {
            id: data.user.id,
            full_name: fullName,
            email: testEmail,
            role: "agent",
            is_active: true,
          },
          { onConflict: "id" },
        );
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
