import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { getCurrentProfile } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { incrementUsageMetric } from "@/lib/usage-metrics";
import {
  canManageGmailConnection,
  encryptToken,
  exchangeCodeForConnection,
  readConnectConfig,
  verifyConnectState,
} from "@/lib/inbound/gmail-connect";
import { saveConnection } from "@/lib/inbound/gmail-connect-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const back = (q: string) => NextResponse.redirect(new URL(`/integrations?gmail=${q}`, origin));

  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.redirect(new URL("/login", origin));
  if (!canManageGmailConnection(profile)) return NextResponse.redirect(new URL("/forbidden", origin));

  const limit = await rateLimit(`gmail-connect:${profile.id}`, 10);
  if (!limit.allowed) return errorResponse("rate_limited", 429);

  const cfg = readConnectConfig(process.env, origin);
  if ("error" in cfg) return back(`error&reason=${cfg.error}`);

  const googleError = url.searchParams.get("error");
  if (googleError) return back(`error&reason=${encodeURIComponent(googleError)}`);

  const state = verifyConnectState(url.searchParams.get("state"), cfg.stateSecret);
  // State musí patriť TEJ ISTEJ osobe a agentúre, ktorá je teraz prihlásená — inak by cudzí
  // odkaz mohol pripojiť cudziu schránku do tejto agentúry.
  if (!state || state.profileId !== profile.id || state.agencyId !== profile.agency_id) {
    return back("error&reason=invalid_state");
  }
  const code = url.searchParams.get("code");
  if (!code) return back("error&reason=missing_code");

  try {
    const conn = await exchangeCodeForConnection(cfg, code, fetch);
    const saved = await saveConnection({
      agencyId: profile.agency_id,
      profileId: profile.id,
      gmailUserEmail: conn.gmailUserEmail,
      ciphertext: encryptToken(conn.refreshToken, cfg.tokenKey),
      scopes: conn.scopes,
    });
    if (!saved.ok) return back(`error&reason=${saved.error}`);
    await incrementUsageMetric({ agencyId: profile.agency_id, metric: "gmail_connect" });
    return back("connected");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "connect_failed";
    // Kód chyby je protokolový reťazec; token ani kód z URL sa do odpovede nedostanú.
    return back(`error&reason=${encodeURIComponent(msg.split(":")[0])}`);
  }
}
