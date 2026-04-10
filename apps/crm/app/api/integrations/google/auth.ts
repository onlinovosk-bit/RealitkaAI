import { NextResponse } from 'next/server';

// Redirect user to Google OAuth consent screen
export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_APP_URL + '/api/integrations/google/callback';
  const scope = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/gmail.send',
    'openid',
    'email',
    'profile',
  ].join(' ');
  const url =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&access_type=offline` +
    `&prompt=consent`;
  return NextResponse.redirect(url);
}
