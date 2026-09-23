/**
 * Fail-closed cron/internal Bearer auth.
 *
 * When CRON_SECRET is unset, `Bearer ${undefined}` becomes the literal string
 * "Bearer undefined" — a predictable token. Always refuse if the env is missing.
 */
export function isAuthorizedCronBearer(
  request: Pick<Request, "headers">,
  env: NodeJS.Dict<string> = process.env,
): boolean {
  const secret = env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
