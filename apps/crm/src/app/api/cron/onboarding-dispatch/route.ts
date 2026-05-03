import { NextResponse } from "next/server";
import { runOnboardingDispatch } from "@/lib/onboarding-dispatch";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runOnboardingDispatch();
    return NextResponse.json({ ok: true, ...result, ts: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "dispatch_failed" },
      { status: 500 }
    );
  }
}
