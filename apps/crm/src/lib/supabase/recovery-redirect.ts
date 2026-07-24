const DEFAULT_APP_URL = "https://app.revolis.ai";

/** Server-side PKCE exchange — use instead of landing on /reset-password?code= */
export function getPasswordRecoveryRedirectUrl(appUrl?: string): string {
  const base = (appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL).replace(/\/$/, "");
  return `${base}/auth/callback?next=/reset-password`;
}
