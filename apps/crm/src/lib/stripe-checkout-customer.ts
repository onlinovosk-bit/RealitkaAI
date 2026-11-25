/**
 * Stripe Checkout customer binding.
 *
 * Checkout must reuse `agencies.stripe_customer_id` when present. Passing only
 * `customer_email` mints a new Customer on every session (top-up, re-subscribe).
 * Portal / billing status that resolve by email then hit the newest orphan and
 * miss the live subscription Customer.
 *
 * Stripe rejects `customer` + `customer_email` together — exactly one.
 */
export function stripeCheckoutCustomerBinding(input: {
  stripeCustomerId: string | null | undefined;
  email: string;
}): { customer: string } | { customer_email: string } {
  const id = typeof input.stripeCustomerId === "string" ? input.stripeCustomerId.trim() : "";
  if (id) return { customer: id };
  return { customer_email: input.email };
}
