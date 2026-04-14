import { NextResponse } from "next/server";
import { verifyGoogleOAuthState } from "@/lib/google-oauth-state";
import { saveGoogleCalendarTokens } from "@/lib/google-calendar-server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const err = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  if (err) {
    return NextResponse.redirect(
      new URL(`/settings?google=error&reason=${encodeURIComponent(err)}`, appUrl)
    );
  }

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const profileId = verifyGoogleOAuthState(state);
  if (!profileId) {
    return NextResponse.redirect(
      new URL("/settings?google=error&reason=invalid_state", appUrl)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${appUrl}/api/integrations/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET" },
      { status: 500 }
    );
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (!tokenData.access_token) {
    return NextResponse.redirect(
      new URL(
        `/settings?google=error&reason=${encodeURIComponent(tokenData.error || "token")}`,
        appUrl
      )
    );
  }

  const saved = await saveGoogleCalendarTokens(profileId, {
    refresh_token: tokenData.refresh_token,
    access_token: tokenData.access_token,
    expires_in: tokenData.expires_in,
  });

  if (!saved) {
    return NextResponse.redirect(
      new URL("/settings?google=error&reason=save_failed", appUrl)
    );
  }

  return NextResponse.redirect(new URL("/settings?google=connected", appUrl));
}
