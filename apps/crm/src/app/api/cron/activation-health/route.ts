import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  buildActivationHealthSummary,
  runActivationEmailDispatch,
} from "@/lib/activation/dispatch";

export const dynamic = "force-dynamic";

/**
 * Denne: klasifikácia S0–S4, odoslanie aktivačných e-mailov (ak ONBOARDING_EMAILS_ENABLED=true),
 * súhrn rizikových účtov pre founder inbox.
 * Registrácia cronu: návrh v PR popise (vercel.json nedotýkať).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role not configured" }, { status: 500 });
  }

  const [dispatch, health] = await Promise.all([
    runActivationEmailDispatch(admin),
    buildActivationHealthSummary(admin),
  ]);

  return NextResponse.json({
    ok: true,
    dispatch,
    health,
    atRiskCount: health.atRisk.length,
  });
}
