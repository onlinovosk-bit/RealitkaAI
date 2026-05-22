import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { logInfo } from "@/lib/logger";
import type { RevenueTelemetryEvent } from "@/lib/analytics/revenue-telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EVENTS: RevenueTelemetryEvent[] = [
  "upgrade_cta",
  "forecast_open",
  "market_signal",
  "demo_start",
  "demo_finish",
];

export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    const body = (await request.json()) as {
      event?: RevenueTelemetryEvent;
      payload?: Record<string, unknown>;
    };

    const event = body.event;
    if (!event || !ALLOWED_EVENTS.includes(event)) {
      return NextResponse.json({ ok: false, error: "Invalid event" }, { status: 400 });
    }

    logInfo("[revenue-telemetry]", {
      event,
      profileId: profile?.id ?? null,
      accountTier: (profile as { account_tier?: string } | null)?.account_tier ?? null,
      payload: body.payload ?? {},
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
