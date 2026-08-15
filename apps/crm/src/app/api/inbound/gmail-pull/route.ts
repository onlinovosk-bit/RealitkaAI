import { NextRequest, NextResponse } from "next/server";
import { runGmailInboundPull } from "@/lib/inbound/gmail-pull";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected || req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const result = await runGmailInboundPull({ fetch });
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}

export const GET = handle;
export const POST = handle;
