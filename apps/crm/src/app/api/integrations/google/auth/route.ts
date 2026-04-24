import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { signGoogleOAuthState } from "@/lib/google-oauth-state";

// Presmerovanie na Google OAuth (Calendar + Gmail scope ako predtým)
export async function GET(req: Request) {
  const reqUrl = new URL(req.url);
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    reqUrl.origin;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const profile = await getCurrentProfile();
  if (!profile?.id) {
    return NextResponse.json(
      { error: "Profil sa nenašiel. Skús sa znova prihlásiť." },
      { status: 400 }
    );
  }

  const clientId =
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json(
      { error: "Chýba GOOGLE_CLIENT_ID (alebo GOOGLE_OAUTH_CLIENT_ID)." },
      { status: 500 }
    );
  }

  const redirectUri = `${appUrl}/api/integrations/google/callback`;
  const state = signGoogleOAuthState(profile.id);

  const scope = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/gmail.send",
    "openid",
    "email",
    "profile",
  ].join(" ");

  const url =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&state=${encodeURIComponent(state)}`;

  return NextResponse.redirect(url);
}
