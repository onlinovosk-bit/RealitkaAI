import { NextRequest, NextResponse } from "next/server";
import { runMonthlyCreditCycle } from "@/lib/credits/monthly-cycle";

/**
 * Mesačný kreditový cyklus — 1. deň mesiaca (vercel.json).
 * Nahrádza dvojicu credits-expire + credits-grant, ktorá bežala hodinu po sebe
 * a pri ±59 min jitteri Vercel Hobby sa mohla vykonať v opačnom poradí.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runMonthlyCreditCycle();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
