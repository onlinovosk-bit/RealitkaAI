import Stripe from "stripe";
import { autoErrorCapture } from "./auto-error-capture";
import { createActivity } from "@/lib/activities-store";
import { PLAN_KEYS, PLAN_LIMITS } from "@/lib/billing-types";
import { AI_ASSISTANT_NAME } from "@/lib/ai-brand";

import { logInfo } from "./logger";
function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    // Do not log or throw if missing, just return null
    return null;
  }

  logInfo("Stripe client initialized", "getStripe");
  return new Stripe(secretKey);
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

async function loadAuthHelpers() {
  return import("@/lib/auth");
}

export const BILLING_PLANS = [
  {
    key: PLAN_KEYS.STARTER,
    name: "Starter",
    priceId: process.env.STRIPE_PRICE_STARTER || "",
    priceLabel: "49 € / mesiac",
    originalPriceLabel: "98 € / mesiac",
    description: "Pre samostatných maklérov a malé kancelárie. AI prioritizácia príležitostí, základné fázy predaja, email podpora. Väčšina kancelárií prejde na Pro do 60 dní.",
    billingNote: "Fakturované mesačne. Zrušenie kedykoľvek. Do 3 maklérov. 100% garancia vrátenia do 30 dní.",
    recommended: false,
    features: [
      "Do 3 maklérov",
      "Do 100 príležitostí mesačne",
      "AI prioritizácia príležitostí",
      "Základné fázy predaja",
      "Email podpora",
      "100% garancia vrátenia do 30 dní",
    ],
    limits: PLAN_LIMITS.starter,
    founderPrice: true,
    founderNote: "Zakladateľská cena – prvých 20 kancelárií",
  },
  {
    key: PLAN_KEYS.PRO,
    name: "Pro",
    priceId: process.env.STRIPE_PRICE_PRO || "",
    priceLabel: "99 € / mesiac",
    originalPriceLabel: "198 € / mesiac",
    description: `Najpopulárnejší plán. ${AI_ASSISTANT_NAME} odpovedá 24/7, automatické opätovné kontakty, AI párovanie príležitostí s nehnuteľnosťami, integrácie s portálmi. Kancelárie s Pro uzatvárajú o 34% viac obchodov.`,
    billingNote: "Fakturované mesačne. Zrušenie kedykoľvek. Neobmedzení makléri.",
    recommended: true,
    features: [
      "Neobmedzení makléri",
      "Neobmedzené príležitosti",
      `${AI_ASSISTANT_NAME} asistentka 24/7`,
      "AI párovanie príležitostí – nehnuteľnosti",
      "Integrácie: Nehnuteľnosti.sk, Reality.sk",
      "Automatické opätovné kontakty",
      "Pokročilé AI hodnotenie",
      "Prioritná podpora",
      "100% garancia vrátenia",
    ],
    limits: PLAN_LIMITS.pro,
    founderPrice: true,
    founderNote: "Zakladateľská cena – prvých 20 kancelárií",
  },
  {
    key: PLAN_KEYS.ENTERPRISE,
    name: "Enterprise",
    priceId: process.env.STRIPE_PRICE_ENTERPRISE || "",
    priceLabel: "299 € / mesiac",
    originalPriceLabel: "598 € / mesiac",
    description: "Pre väčšie kancelárie s viacerými tímami. Neobmedzený počet maklérov, pokročilá analytika tímu, vlastné AI modely a prioritná podpora. Kancelária s 5 maklérmi ušetrí 400€+ mesačne.",
    billingNote: "Fakturované mesačne. Zrušenie kedykoľvek. Multi-tím podpora. 100% garancia vrátenia do 30 dní.",
    recommended: false,
    features: [
      "Všetko z Pro plánu",
      "Neobmedzené tímy",
      "Vlastné AI modely",
      "Performance fee tracking",
      "Pokročilá analytika tímu",
      "Vlastné nastavenie systému",
      "Dedikovaný správca účtu",
      "SLA garancia 99.9%",
      "Enterprise Academy prístup",
      "100% garancia vrátenia do 30 dní",
    ],
    limits: PLAN_LIMITS.enterprise,
    founderPrice: true,
    founderNote: "Zakladateľská cena – prvých 20 kancelárií",
  },
] as const;

export async function createBillingCheckoutSession(planKey: string) {
  const stripe = getStripe();
  if (!stripe) {
    // Stripe nie je nakonfigurovaný, vráť null alebo vyhoď špecifickú chybu podľa potreby
    return null;
  }
  const { getCurrentUser, getCurrentProfile } = await loadAuthHelpers();
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  if (!user?.email) {
    throw new Error("Používateľ nemá email.");
  }

  const plan = BILLING_PLANS.find((item) => item.key === planKey);

  if (!plan || !plan.priceId) {
    throw new Error("Neplatný plan alebo chýba Stripe price ID.");
  }

  const appUrl = getAppUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price: plan.priceId,
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/billing?checkout=success`,
    cancel_url: `${appUrl}/billing?checkout=cancel`,
    customer_email: user.email,
    client_reference_id: user.id,
    allow_promotion_codes: true,
    metadata: {
      authUserId: user.id,
      profileId: profile?.id || "",
      agencyId: (profile as any)?.agencyId || (profile as any)?.agency_id || "",
      planKey: plan.key,
    },
  });

  return {
    id: session.id,
    url: session.url,
  };
}

export async function findStripeCustomerByCurrentUserEmail() {
  const stripe = getStripe();
  if (!stripe) return null;
  const { getCurrentUser } = await loadAuthHelpers();
  const user = await getCurrentUser();

  if (!user?.email) {
    return null;
  }

  const customers = await stripe.customers.list({
    email: user.email,
    limit: 10,
  });

  if (!customers.data.length) {
    return null;
  }

  return customers.data[0];
}

export async function createCustomerPortalSession() {
  const stripe = getStripe();
  if (!stripe) {
    return {
      hasStripeConfigured: false,
      hasCustomer: false,
      url: null as string | null,
    };
  }

  const customer = await findStripeCustomerByCurrentUserEmail();

  if (!customer) {
    // user nemá Stripe customer – NIE je to 500 error, ale stav
    return {
      hasStripeConfigured: true,
      hasCustomer: false,
      url: null as string | null,
    };
  }

  const appUrl = getAppUrl();

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: `${appUrl}/billing`,
  });

  return {
    hasStripeConfigured: true,
    hasCustomer: true,
    url: session.url ?? null,
  };
}

export async function getCurrentBillingStatus() {
  const stripe = getStripe();
  if (!stripe) {
    return {
      hasCustomer: false,
      hasSubscription: false,
      customer: null,
      subscription: null,
      invoices: [],
    };
  }
  const customer = await findStripeCustomerByCurrentUserEmail();

  if (!customer) {
    return {
      hasCustomer: false,
      hasSubscription: false,
      customer: null,
      subscription: null,
      invoices: [],
    };
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customer.id,
    status: "all",
    limit: 10,
  });

  const invoices = await stripe.invoices.list({
    customer: customer.id,
    limit: 5,
  });

  const activeSubscription =
    subscriptions.data.find((item) => item.status === "active") ||
    subscriptions.data.find((item) => item.status === "trialing") ||
    subscriptions.data[0] ||
    null;

  return {
    hasCustomer: true,
    hasSubscription: Boolean(activeSubscription),
    customer: {
      id: customer.id,
      email: customer.email,
      name: customer.name ?? null,
    },
    subscription: activeSubscription
      ? {
          id: activeSubscription.id,
          status: activeSubscription.status,
          currency: activeSubscription.currency,
          currentPeriodEnd: activeSubscription.items.data[0]?.current_period_end || null,
          items: activeSubscription.items.data.map((item) => ({
            id: item.id,
            priceId: item.price.id,
            productId: String(item.price.product),
            interval: item.price.recurring?.interval || null,
            amount: item.price.unit_amount || 0,
          })),
        }
      : null,
    invoices: invoices.data.map((invoice) => ({
      id: invoice.id,
      status: invoice.status,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      created: invoice.created,
    })),
  };
}

export async function handleStripeWebhookEvent(event: Stripe.Event) {
  const object: any = event.data.object;

  try {
    if (event.type === "checkout.session.completed") {
      await createActivity({
        leadId: null,
        type: "Billing",
        title: "Checkout session dokončená",
        text: `Stripe checkout bol úspešne dokončený pre ${object.customer_email || "zákazníka"}.`,
        entityType: "billing",
        entityId: object.id,
        actorName: "Stripe",
        source: "billing",
        severity: "success",
        meta: {
          eventType: event.type,
          customer: object.customer,
          subscription: object.subscription,
        },
      });
    }

    if (event.type === "customer.subscription.created") {
      await createActivity({
        leadId: null,
        type: "Billing",
        title: "Predplatné bolo vytvorené",
        text: `Vzniklo nové Stripe predplatné ${object.id}.`,
        entityType: "billing",
        entityId: object.id,
        actorName: "Stripe",
        source: "billing",
        severity: "success",
        meta: {
          eventType: event.type,
          customer: object.customer,
          status: object.status,
        },
      });
    }

    if (event.type === "customer.subscription.updated") {
      await createActivity({
        leadId: null,
        type: "Billing",
        title: "Predplatné bolo upravené",
        text: `Stripe predplatné ${object.id} bolo aktualizované na stav ${object.status}.`,
        entityType: "billing",
        entityId: object.id,
        actorName: "Stripe",
        source: "billing",
        severity: "info",
        meta: {
          eventType: event.type,
          customer: object.customer,
          status: object.status,
        },
      });
    }

    if (event.type === "customer.subscription.deleted") {
      await createActivity({
        leadId: null,
        type: "Billing",
        title: "Predplatné bolo zrušené",
        text: `Stripe predplatné ${object.id} bolo zrušené.`,
        entityType: "billing",
        entityId: object.id,
        actorName: "Stripe",
        source: "billing",
        severity: "warning",
        meta: {
          eventType: event.type,
          customer: object.customer,
          status: object.status,
        },
      });
    }

    if (event.type === "invoice.paid") {
      await createActivity({
        leadId: null,
        type: "Billing",
        title: "Faktúra bola uhradená",
        text: `Stripe faktúra ${object.id} bola úspešne uhradená.`,
        entityType: "billing",
        entityId: object.id,
        actorName: "Stripe",
        source: "billing",
        severity: "success",
        meta: {
          eventType: event.type,
          customer: object.customer,
          subscription: object.subscription,
          amountPaid: object.amount_paid,
        },
      });
    }

    if (event.type === "invoice.payment_failed") {
      await createActivity({
        leadId: null,
        type: "Billing",
        title: "Platba za faktúru zlyhala",
        text: `Platba za Stripe faktúru ${object.id} zlyhala.`,
        entityType: "billing",
        entityId: object.id,
        actorName: "Stripe",
        source: "billing",
        severity: "warning",
        meta: {
          eventType: event.type,
          customer: object.customer,
          subscription: object.subscription,
        },
      });
    }
  } catch (error) {
    console.error("Billing activity logging error:", error);
  }

  return { ok: true };
}

export async function getCurrentPlanTier(): Promise<"free" | "pro"> {
  const status = await getCurrentBillingStatus();
  if (status.hasSubscription) return "pro";
  return "free";
}

export function verifyStripeWebhook(payload: string | Buffer, signature: string) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("Chýba STRIPE_WEBHOOK_SECRET.");
  }
  if (!stripe) {
    throw new Error("Stripe client nie je inicializovaný.");
  }
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
