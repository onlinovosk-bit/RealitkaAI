import { NextResponse } from "next/server";

import { runAImatching } from "@/lib/ai/matching-engine";

export const runtime = "nodejs";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) {
    return true;
  }

  const headerSecret = request.headers.get("x-cron-secret");
  if (headerSecret === secret) {
    return true;
  }

  return false;
}

/**
 * GET /api/cron/daily-match
 * Plánovač (Vercel Cron, Railway, …) – 07:00 s Authorization: Bearer CRON_SECRET
 */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await runAImatching();
    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Daily match run failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
