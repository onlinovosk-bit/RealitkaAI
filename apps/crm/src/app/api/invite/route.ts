export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("auth_user_id", user.id).single();
    if (profile?.role !== "owner" && profile?.role !== "founder") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { email, fullName, role } = await request.json();

    if (!email || !fullName) {
      return NextResponse.json({ ok: false, error: "Vyplňte meno a email." }, { status: 400 });
    }

    const admin = createAdminClient();

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
