import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { getCurrentProfile } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { incrementUsageMetric } from "@/lib/usage-metrics";
import {
  buildConnectUrl,
  canManageGmailConnection,
  readConnectConfig,
  signConnectState,
} from "@/lib/inbound/gmail-connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Presmeruje prihláseného vlastníka/manažéra agentúry na súhlas Googlu (iba čítanie). */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.redirect(new URL("/login", origin));
  if (!canManageGmailConnection(profile)) {
    return NextResponse.redirect(new URL("/forbidden", origin));
  }
  // Brzda na opakované klikanie / skripty: súhlas u Googlu nie je lacný a nemá sa zneužiť na záplavu.
  const limit = await rateLimit(`gmail-connect:${profile.id}`, 10);
  if (!limit.allowed) return errorResponse("rate_limited", 429);
  const cfg = readConnectConfig(process.env, origin);
  if ("error" in cfg) {
    return NextResponse.redirect(new URL(`/integrations?gmail=error&reason=${cfg.error}`, origin));
  }
  await incrementUsageMetric({ agencyId: profile.agency_id, metric: "gmail_connect_started" });
  // Agentúra sa berie z prihláseného profilu, nikdy z parametra požiadavky.
  const state = signConnectState({ agencyId: profile.agency_id, profileId: profile.id }, cfg.stateSecret);
  return NextResponse.redirect(buildConnectUrl(cfg, state));
}
