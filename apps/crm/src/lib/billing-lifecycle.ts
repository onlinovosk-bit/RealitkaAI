import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { describeError } from "@/lib/log-safe";
import {
  SEAT_TIERS,
  SEAT_TIER_CONFIG,
  SEAT_TIER_STRIPE_ENV,
  cockpitLiteEligible,
  type SeatTier,
} from "@/lib/program-tier-pricing";

/**
 * Životný cyklus predplatného → `agencies`.
 *
 * Seat checkout zapisuje entitlementy na `agencies` (`applySeatCheckoutEntitlements`),
 * ale zrušenie, zmena počtu miest a zlyhaná platba dovtedy končili len v tabuľke
 * `profiles` (`syncAccountTier`, jeden používateľ). Kancelária, ktorá zrušila,
 * si tak nechala plán a miesta a v MRR ostala ako platiaca.
 *
 * Stav sa neberie z udalosti, ale zo Stripe (`subscriptions.retrieve`). Udalosti
 * môžu prísť mimo poradia a opakovane; aktuálny stav predplatného je jeden a
 * zápis je idempotentný, takže poradie nerozhoduje.
 *
 * Chyba sa NEPOLYKÁ: kto zavolá túto funkciu, dostane výnimku a odpovie non-2xx,
 * aby Stripe udalosť zopakoval.
 */

const LIFECYCLE_EVENTS = new Set([
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

/** Stavy, v ktorých kancelária o platený plán prichádza. `past_due` je odklad: Stripe ešte platbu opakuje. */
const REVOKING_STATUSES = new Set(["canceled", "unpaid", "incomplete_expired"]);

export type StripeSubscriptionReader = {
  subscriptions: { retrieve(id: string): Promise<Stripe.Subscription> };
};

export type LifecycleResult =
  | { applied: true; agencyId: string; status: string; revoked: boolean }
  | {
      applied: false;
      reason: "not_lifecycle_event" | "no_subscription_id" | "unknown_subscription" | "other_subscription";
    };

function subscriptionIdOf(event: Stripe.Event): string | null {
  const object = event.data.object as unknown as Record<string, unknown>;
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    return typeof object.id === "string" ? object.id : null;
  }
  // Starší tvar faktúry nesie `subscription`, novší `parent.subscription_details.subscription`.
  const parent = object.parent as { subscription_details?: { subscription?: unknown } } | undefined;
  const raw = object.subscription ?? parent?.subscription_details?.subscription;
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && typeof (raw as { id?: unknown }).id === "string") {
    return (raw as { id: string }).id;
  }
  return null;
}

function defaultStripe(): StripeSubscriptionReader {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY chýba, stav predplatného sa nedá overiť");
  return new Stripe(key, { timeout: 5000, maxNetworkRetries: 1 });
}

async function loadSubscription(
  stripe: StripeSubscriptionReader,
  event: Stripe.Event,
  id: string,
): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.retrieve(id);
  } catch (err) {
    // Zmazané predplatné môže byť po zrušení už nedostupné; udalosť `deleted` nesie jeho posledný stav.
    const code = (err as { code?: unknown } | null)?.code;
    if (event.type === "customer.subscription.deleted" && code === "resource_missing") {
      return event.data.object as Stripe.Subscription;
    }
    throw err;
  }
}

function seatItemOf(
  subscription: Stripe.Subscription,
): { tier: SeatTier; quantity: number } | null {
  for (const item of subscription.items?.data ?? []) {
    const priceId = item.price?.id;
    if (!priceId) continue;
    for (const tier of SEAT_TIERS) {
      const configured = process.env[SEAT_TIER_STRIPE_ENV[tier]]?.trim();
      if (configured && configured === priceId) {
        return { tier, quantity: item.quantity ?? 1 };
      }
    }
  }
  return null;
}

type AgencyRow = {
  id: string;
  stripe_subscription_id: string | null;
  owner_cockpit_active: boolean | null;
};

export async function syncAgencyBillingLifecycle(
  event: Stripe.Event,
  deps: { stripe?: StripeSubscriptionReader } = {},
): Promise<LifecycleResult> {
  if (!LIFECYCLE_EVENTS.has(event.type)) return { applied: false, reason: "not_lifecycle_event" };

  const subscriptionId = subscriptionIdOf(event);
  if (!subscriptionId) return { applied: false, reason: "no_subscription_id" };

  const supabase = createServiceRoleClient();
  if (!supabase) throw new Error("service role klient nie je dostupný, stav predplatného sa nezapíše");

  const subscription = await loadSubscription(deps.stripe ?? defaultStripe(), event, subscriptionId);
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;

  const select = "id, stripe_subscription_id, owner_cockpit_active";
  const bySubscription = await supabase
    .from("agencies")
    .select(select)
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  if (bySubscription.error) throw new Error(`agencies lookup: ${describeError(bySubscription.error)}`);

  let agency = bySubscription.data as AgencyRow | null;

  if (!agency && customerId) {
    const byCustomer = await supabase
      .from("agencies")
      .select(select)
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (byCustomer.error) throw new Error(`agencies lookup: ${describeError(byCustomer.error)}`);
    const candidate = byCustomer.data as AgencyRow | null;
    // Zákazník môže mať viac predplatných. Staré, zrušené predplatné nesmie odobrať
    // plán kancelárii, ktorej platí iné.
    if (candidate && candidate.stripe_subscription_id && candidate.stripe_subscription_id !== subscriptionId) {
      return { applied: false, reason: "other_subscription" };
    }
    agency = candidate;
  }

  if (!agency) return { applied: false, reason: "unknown_subscription" };

  const status = subscription.status;
  const revoked = REVOKING_STATUSES.has(status);
  const update: Record<string, unknown> = {
    subscription_status: status,
    stripe_subscription_id: subscriptionId,
    billing_updated_at: new Date().toISOString(),
  };

  if (revoked) {
    update.account_tier = "free";
    update.owner_cockpit_active = false;
    update.cockpit_tier = null;
  } else {
    const seat = seatItemOf(subscription);
    if (seat) {
      const config = SEAT_TIER_CONFIG[seat.tier];
      const seats = Math.max(config.minSeats, seat.quantity);
      update.seats = seats;
      update.account_tier = config.planKey;
      update.cockpit_tier = agency.owner_cockpit_active ? "owner" : cockpitLiteEligible(seats) ? "lite" : null;
    }
  }

  const { error } = await supabase.from("agencies").update(update).eq("id", agency.id);
  if (error) throw new Error(`agencies update: ${describeError(error)}`);

  return { applied: true, agencyId: agency.id, status, revoked };
}
