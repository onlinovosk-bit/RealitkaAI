export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.revolis.ai").replace(/\/$/, "");

async function getAuthorizedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, error: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (profile?.role !== "owner" && profile?.role !== "founder") {
    return { supabase, user: null, error: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }) };
  }

  return { supabase, user, error: null };
}

export async function GET() {
  const { user, error } = await getAuthorizedUser();
  if (error) return error;

  return NextResponse.json({
    ok: true,
    email: user?.email ?? "",
  });
}

export async function POST(request: Request) {
  const { supabase, user, error } = await getAuthorizedUser();
  if (error) return error;
  if (!user?.email) {
    return NextResponse.json({ ok: false, error: "User email missing." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const action = String(body?.action ?? "");

    if (action === "recovery") {
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${APP_URL}/dashboard`,
      });

      if (recoveryError) {
        return NextResponse.json({ ok: false, error: recoveryError.message }, { status: 400 });
      }

      return NextResponse.json({
        ok: true,
        message: `Recovery e-mail odoslaný na ${user.email}.`,
      });
    }

    if (action === "invite") {
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
