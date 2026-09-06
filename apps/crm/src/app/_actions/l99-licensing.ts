"use server";

type L99Balik = "pro" | "enterprise";

/**
 * Former free entitlement writer (service_role update of account_tier).
 * Disabled: any "use server" export is a callable action endpoint.
 * Paid L99 / Enterprise tiers come only from Stripe billing webhooks.
 */
export async function upgradeToL99(_authUserId: string, _balik: L99Balik) {
  throw new Error(
    "upgradeToL99 is disabled; entitlements come from Stripe/billing only.",
  );
}
