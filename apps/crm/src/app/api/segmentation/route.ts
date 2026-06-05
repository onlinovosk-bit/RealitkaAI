import { NextResponse } from "next/server";

/**
 * @deprecated AI Segmentation pipeline replaced by ai_priority triage (commit #107).
 * Kept as 410 shim for ~4 weeks to catch any stale callers.
 * TODO: delete after 2026-07-05 if no calls in Vercel logs.
 */
const GONE_BODY = { error: "This endpoint has been deprecated." };

export async function GET() {
  return NextResponse.json(GONE_BODY, { status: 410 });
}

export async function POST() {
  return NextResponse.json(GONE_BODY, { status: 410 });
}
