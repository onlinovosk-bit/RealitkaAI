import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { scanDormantLeads } from "@/lib/l99/shadow-inventory";

/**
 * POST /api/enterprise/onboard-start
 *
 * White-glove Enterprise onboarding:
 * 1. Nastaví account_tier na 'enterprise'
 * 2. Uloží professional_tone preference pre AI Asistenta
 * 3. Spustí Initial Shadow Inventory Scan
 */
export async function POST() {
  const user = await requireUser();
  const supabase = await createClient();

  // 1. Upgrade na Enterprise tier
  const { error: tierError } = await supabase
    .from("profiles")
    .update({
      account_tier: "enterprise",
      ai_tone: "professional",
      enterprise_onboarded_at: new Date().toISOString(),
    })
    .eq("auth_user_id", user.id);

  if (tierError) {
    return NextResponse.json({ ok: false, error: tierError.message }, { status: 500 });
  }

  // 2. Načítaj agency_id pre shadow inventory scan
  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("auth_user_id", user.id)
    .single();

  // 3. Spusti Initial Shadow Inventory Scan
  let shadowSignals: Awaited<ReturnType<typeof scanDormantLeads>> = [];
  if (profile?.agency_id) {
    try {
      shadowSignals = await scanDormantLeads(profile.agency_id);
    } catch {
      // Scan nie je blocker — pokračuj
    }
  }

  return NextResponse.json({
    ok: true,
    tier: "enterprise",
    aiTone: "professional",
    shadowSignalsFound: shadowSignals.length,
    message: `Enterprise aktivovaný. Nájdených ${shadowSignals.length} dormantných príležitostí.`,
  });
}
