export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { role } = await req.json();

    if (!["agent", "owner"].includes(role)) {
      return NextResponse.json({ ok: false, error: "Neplatná rola." }, { status: 400 });
    }

    // Zisti aktuálneho usera
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Nie si prihlásený." }, { status: 401 });
    }

    // Mapuj "owner" → "manager" (existujúca DB hodnota), "agent" → "agent"
    const dbRole = role === "owner" ? "manager" : "agent";

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ ok: false, error: "Konfigurácia chýba." }, { status: 500 });
    }

    const admin = createAdminClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    await admin
      .from("profiles")
      .upsert({ id: user.id, role: dbRole }, { onConflict: "id" });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Chyba" },
      { status: 500 }
    );
  }
}
