/** Rozpoznanie neplatného / chýbajúceho refresh tokenu (Supabase SSR + browser). */
export function isInvalidRefreshTokenError(error: unknown): boolean {
  const msg = (
    error instanceof Error ? error.message : String(error ?? "")
  ).toLowerCase();
  return (
    msg.includes("refresh token not found") ||
    msg.includes("invalid refresh token") ||
    msg.includes("refresh_token_not_found") ||
    (msg.includes("refresh") && msg.includes("invalid"))
  );
}
