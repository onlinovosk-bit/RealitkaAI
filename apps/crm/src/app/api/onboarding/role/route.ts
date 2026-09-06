export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Historically this route used the service-role admin client to upsert
 * profiles.role (owner → manager) for any authenticated caller — privilege
 * escalation. Role assignment belongs to invite/admin (service_role) paths
 * only. Onboarding UI keeps role in client form state and does not call this.
 */
export async function POST(_req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Nie si prihlásený." }, { status: 401 });
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Self-service zmena role je zakázaná. Rolu nastaví majiteľ cez pozvánku.",
      },
      { status: 403 },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Chyba" },
      { status: 500 },
    );
  }
}
