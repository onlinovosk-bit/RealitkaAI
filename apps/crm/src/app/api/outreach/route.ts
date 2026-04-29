import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: targets, error } = await supabase
    .from("AI AGENT AUTOMAT ONBOARDING no.2.01")
    .select("*")
    .eq("segment", "A")
    .is("contacted_at", null);

  if (error) {
    console.error("Fetch outreach targets failed:", error);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  // Tu neskôr: volanie email/SMS/WhatsApp providerov
  // Zatiaľ len označíme, že by boli kontaktovaní
  const now = new Date().toISOString();

  for (const t of targets ?? []) {
    try {
      await supabase
        .from("AI AGENT AUTOMAT ONBOARDING no.2.01")
        .update({ contacted_at: now })
        .eq("id", t.id);
    } catch (e) {
      console.error("Mark contacted failed:", e);
    }
  }

  return NextResponse.json({ planned_outreach: targets?.length ?? 0 });
}
