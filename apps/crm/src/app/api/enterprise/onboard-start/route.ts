import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scanDormantLeads } from "@/lib/l99/shadow-inventory";

const ENTERPRISE_TIERS = new Set([
  "enterprise",
  "market_vision",
  "protocol_authority",
]);

/**
 * POST /api/enterprise/onboard-start
 *
 * White-glove Enterprise onboarding helper for accounts that already hold a
 * paid Enterprise / Market Vision / Protocol tier.
 *
 * Never writes account_tier / ui_role — those are billing/service_role only.
 * A previous version self-assigned account_tier=enterprise for any authenticated
 * caller, which normalizeProfileEntitlements then promoted to owner_vision.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("agency_id, account_tier")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
  }

  const tier = String(profile?.account_tier ?? "")
    .trim()
    .toLowerCase();

  if (!ENTERPRISE_TIERS.has(tier)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Enterprise onboarding vyžaduje aktívny Enterprise / Market Vision plán (billing).",
      },
      { status: 403 },
    );
  }

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
    tier,
    shadowSignalsFound: shadowSignals.length,
    message: `Enterprise onboarding. Nájdených ${shadowSignals.length} dormantných príležitostí.`,
  });
}
