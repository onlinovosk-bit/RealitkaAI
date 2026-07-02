/** Idempotency kľúče grant engine — agency + YYYYMM. */
export function monthlyGrantIdempotencyKey(
  agencyId: string,
  periodKey: string,
): string {
  return `grant:${agencyId}:${periodKey}`;
}

export function grantExpiryIdempotencyKey(
  agencyId: string,
  periodKey: string,
): string {
  return `grant_expiry:${agencyId}:${periodKey}`;
}
