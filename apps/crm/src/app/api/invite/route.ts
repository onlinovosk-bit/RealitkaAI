export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { email, fullName, role } = await request.json();

    if (!email || !fullName) {
      return NextResponse.json({ ok: false, error: "Vyplňte meno a email." }, { status: 400 });
    }

    const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key  = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json({ ok: false, error: "Chýba konfigurácia Supabase." }, { status: 500 });
    }

    const admin = createAdminClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role: role ?? "agent" },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/dashboard`,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    // Upsert profile row so agent appears in team lists
    await admin.from("profiles").upsert({
      id: data.user.id,
      full_name: fullName,
      email,
      role: role ?? "agent",
      is_active: true,
    }, { onConflict: "id" });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Pozvánka zlyhala." },
      { status: 500 }
    );
  }
}
