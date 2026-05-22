import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { logInfo } from "@/lib/logger";
import type { UpgradeIntentEvent } from "@/lib/license/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EVENTS: UpgradeIntentEvent[] = [
  "locked_feature_view",
  "upgrade_cta_click",
  "forecast_attempt",
  "market_intel_attempt",
  "guardian_teaser_open",
  "upgrade_modal_open",
  "upgrade_modal_dismiss",
];

export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    const body = (await request.json()) as {
      event?: UpgradeIntentEvent;
      payload?: Record<string, unknown>;
    };

    const event = body.event;
    if (!event || !ALLOWED_EVENTS.includes(event)) {
      return NextResponse.json({ ok: false, error: "Invalid event" }, { status: 400 });
    }

    logInfo("[upgrade-intent]", {
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
