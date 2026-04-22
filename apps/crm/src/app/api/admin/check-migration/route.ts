import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Endpoint na overenie stavu DB migrácie
// GET /api/admin/check-migration?secret=<CRON_SECRET>

export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase config chýba" }, { status: 500 });
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const checks: Record<string, boolean> = {};

  // 1. gdpr_consent v leads_demo
  const { error: gdprErr } = await supabase
    .from("leads_demo")
    .select("gdpr_consent")
    .limit(1);
  checks["leads_demo.gdpr_consent"] = !gdprErr;

  // 2. roi_guarantee_claims tabuľka
  const { error: roiErr } = await supabase
    .from("roi_guarantee_claims")
    .select("id")
    .limit(1);
  checks["roi_guarantee_claims table"] = !roiErr;

  // 3. account_tier v profiles
  const { error: tierErr } = await supabase
    .from("profiles")
    .select("account_tier")
    .limit(1);
  checks["profiles.account_tier"] = !tierErr;

  const allOk = Object.values(checks).every(Boolean);
  return NextResponse.json({
    allOk,
    checks,
    message: allOk
      ? "Všetky stĺpce existujú – migrácia OK"
      : "Niektoré stĺpce chýbajú – spusti SQL migráciu v Supabase",
  });
}
