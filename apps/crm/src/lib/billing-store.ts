import Stripe from "stripe";
import { autoErrorCapture } from "./auto-error-capture";
import { createActivity } from "@/lib/activities-store";
import { PLAN_KEYS, PLAN_LIMITS, type PlanKey } from "@/lib/billing-types";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { logInfo } from "./logger";

// Mapovanie tier → ui_role
const TIER_TO_UI_ROLE: Record<string, string> = {
  free:                "agent",
  starter:             "agent",
  pro:                 "agent",
  enterprise:          "owner_vision",
  market_vision:       "owner_vision",
  command:             "owner_protocol",
  protocol_authority:  "owner_protocol",
};

// Pomocná funkcia – zapíše account_tier + ui_role do profiles
// Preferuje authUserId z metadát, fallback na stripe_customer_id
async function syncAccountTier(
  stripeCustomerIdOrAuthUserId: string,
  priceId: string | null | undefined,
  opts?: { lockDowngrade?: boolean; resetLock?: boolean; byAuthUserId?: boolean }
): Promise<void> {
  const supabase = createServiceRoleClient();
  if (!supabase) return;

  const tier    = resolvePlanKeyFromStripePriceId(priceId);
  const uiRole  = TIER_TO_UI_ROLE[tier] ?? "agent";
  const update: Record<string, string | null | boolean> = {
    account_tier:    tier,
    ui_role:         uiRole,
    protocol_active: uiRole === "owner_protocol",
  };

  if (opts?.lockDowngrade) {
    update.tier_locked_at = new Date().toISOString();
    update.tier_downgraded_from = "enterprise";
  }
  if (opts?.resetLock) {
    update.tier_locked_at = null;
    update.tier_downgraded_from = null;
  }

  if (opts?.byAuthUserId) {
    await supabase
      .from("profiles")
      .update(update)
      .eq("auth_user_id", stripeCustomerIdOrAuthUserId);
  } else {
    // Fallback – hľadaj cez email zákazníka zo Stripe
    const stripe = getStripe();
    if (!stripe) return;
    try {
      const customer = await stripe.customers.retrieve(stripeCustomerIdOrAuthUserId);
      if (customer.deleted || !("email" in customer) || !customer.email) return;
      const { data: users } = await supabase.auth.admin.listUsers();
      const match = users?.users?.find((u) => u.email === customer.email);
      if (!match) return;
      await supabase.from("profiles").update(update).eq("auth_user_id", match.id);
    } catch {
      // Stripe alebo Supabase lookup zlyhal – tier ostáva nezmenený
    }
  }
}
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
  const raw = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim();
  try {
    const parsed = new URL(raw);
    return parsed.origin;
  } catch {
    return "https://app.revolis.ai";
  }
}

async function loadAuthHelpers() {
  return import("@/lib/auth");
}

export const BILLING_PLANS = [
  // ── SMART START ──────────────────────────────────────────────────────────
  {
    key: PLAN_KEYS.STARTER,
    landingName: "Smart Start",
    name: "Smart Start",
    priceId: process.env.STRIPE_PRICE_STARTER || "",
    priceLabel: "49 € / mesiac",
    description:
      "Ideálny štart pre samostatných maklérov. AI Asistent odpovedá počas pracovných hodín, Buyer Readiness Index prioritizuje tvoje príležitosti a denný briefing ti povie čo robiť každé ráno. Väčšina maklérov vidí prvé výsledky do 7 dní.",
    billingNote: "Fakturované mesačne · Zrušenie kedykoľvek · Do 3 maklérov · Podpora 48h",
    recommended: false,
    features: [
      "Do 3 maklérov v tíme",
      "Do 100 príležitostí mesačne",
      "🤖 AI Asistent – odpovede do 2 minút (pracovné hodiny)",
      "📊 Buyer Readiness Index – AI skóre každej príležitosti",
      "📱 WhatsApp + SMS automatické odpovede",
      "🏠 Auto-párovanie príležitostí s nehnuteľnosťami (do 10/mes)",
      "📧 AI email skripty – personalizované podľa správania klienta",
      "⚡ One-click follow-up – AI Asistent navrhne správu, ty schváliš",
      "📋 Denný AI briefing – 5 priorít každé ráno o 8:00",
      "🔔 Hot Alert – notifikácia keď príležitosť dosiahne skóre 75+",
      "📈 Základná analytika konverzií (týždenný report)",
      "🎓 Revolis Academy – prístup k freemium modulom (5 lekcií)",
      "✅ Revolis.AI Certified Agent certifikát",
      "🛡 100% garancia vrátenia do 30 dní",
    ],
    limits: PLAN_LIMITS.starter,
    founderPrice: true,
    founderNote: "Zakladateľská cena – prvých 20 kancelárií",
  },
  // ── ACTIVE FORCE ─────────────────────────────────────────────────────────
  {
    key: PLAN_KEYS.PRO,
    landingName: "Active Force",
    name: "Active Force",
    priceId: process.env.STRIPE_PRICE_PRO || "",
    priceLabel: "99 € / mesiac",
    originalPriceLabel: "198 € / mesiac",
    description:
      "Plný AI arzenál pre aktívneho makléra. Sofia AI 24/7, prediktívny scoring, hovorová analýza a automatické follow-upy.",
    billingNote: "1 maklér · Plný AI prístup · Zrušenie kedykoľvek",
    recommended: true,
    features: [
      "1 maklérska licencia",
      "🤖 AI Asistent 24/7 – odpovede aj v noci",
      "🧠 Predictive Deal Scoring",
      "📞 AI hovorová analýza",
      "🎯 Intent Detection",
      "⚡ Automatické follow-upy (7-dňové sekvencie)",
      "🗺 Territory Intelligence",
      "📊 Revenue Forecasting",
      "🔗 Portálové integrácie",
      "🛡 30-dňová garancia vrátenia",
    ],
    limits: PLAN_LIMITS.pro,
    founderPrice: true,
    founderNote: "Zakladateľská cena – prvých 20 kancelárií",
  },
  // ── MARKET VISION ─────────────────────────────────────────────────────────
  {
    key: PLAN_KEYS.ENTERPRISE,
    landingName: "Market Vision",
    name: "Market Vision",
    priceId: process.env.STRIPE_PRICE_ENTERPRISE || process.env.STRIPE_PRICE_MARKET_VISION || "",
    priceLabel: "199 € / mesiac",
    originalPriceLabel: "398 € / mesiac",
    description:
      "Tímová licencia pre majiteľa kancelárie. Owner dostane Market Vision menu s prehľadom tímu, 1 maklér dostane Active Force prístup.",
    billingNote: "1 owner + 1 Active Force maklér · Tímová licencia",
    recommended: false,
    features: [
      "👑 Owner: Market Vision menu",
      "1× Active Force licencia pre makléra",
      "📊 Prehľad výkonnosti tímu",
      "🔍 Ghost Resurrection – dormantné príležitosti",
      "📋 Executive reporting",
      "🧠 Team AI Brain",
      "🎯 Agent Performance Scoring",
      "📈 Revenue Forecasting pre tím",
      "⚡ Prioritná podpora",
      "🛡 30-dňová garancia vrátenia",
    ],
    limits: PLAN_LIMITS.enterprise,
    founderPrice: true,
    founderNote: "Zakladateľská cena – prvých 20 kancelárií",
  },
  // ── PROTOCOL AUTHORITY ────────────────────────────────────────────────────
  {
    key: PLAN_KEYS.COMMAND,
    landingName: "Protocol Authority",
    name: "Protocol Authority",
    priceId: process.env.STRIPE_PRICE_PROTOCOL_AUTH || "",
    priceLabel: "449 € / mesiac",
    originalPriceLabel: "598 € / mesiac",
    description:
      "Najvyššia úroveň. Owner má Protocol Authority menu s Competition Heatmap a Neural Intelligence. 4 makléri dostanú Active Force prístup.",
    billingNote: "1 Protocol Authority owner + 4 Active Force makléri",
    recommended: false,
    features: [
      "👑 Owner: Protocol Authority menu",
      "4× Active Force licencie pre maklérov",
      "🗺 Competition Heatmap – live radar konkurencie",
      "👻 Ghost Resurrection – pokročilý režim",
      "🛡 Ghost Mode Shield",
      "🧠 Neural Intelligence Network",
      "📊 Cross-tímová analytika",
      "🏢 Multi-pobočková správa",
      "☎ Dedikovaný Protocol Manager",
      "⚡ SLA 99.99% uptime",
      "🛡 30-dňová garancia vrátenia",
    ],
    limits: PLAN_LIMITS.command,
    founderPrice: true,
    founderNote: "Zakladateľská cena – prvých 20 kancelárií",
  },
] as const;

export async function createBillingCheckoutSession(planKey: string, promoCode?: string) {
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

  const onboardingPriceId = process.env.STRIPE_PRICE_ONBOARDING;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price: plan.priceId,
        quantity: 1,
      },
      ...(onboardingPriceId
        ? [{ price: onboardingPriceId, quantity: 1 }]
        : []),
    ],
    success_url: `${appUrl}/billing?checkout=success`,
    cancel_url: `${appUrl}/billing?checkout=cancel`,
    customer_email: user.email,
    client_reference_id: user.id,
    // Ak prišiel promo kód z URL, aplikuj coupon — inak zobraz pole pre kód
    ...(promoCode
      ? { discounts: [{ coupon: promoCode }] }
      : { allow_promotion_codes: true }),
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
      const priceId = object.metadata?.planKey
        ? BILLING_PLANS.find((p) => p.key === object.metadata.planKey)?.priceId
        : undefined;
      const authUserId = object.metadata?.authUserId as string | undefined;
      if (authUserId) {
        await syncAccountTier(authUserId, priceId, { byAuthUserId: true, resetLock: true });
      } else if (object.customer) {
        await syncAccountTier(object.customer as string, priceId, { resetLock: true });
      }

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
        meta: { eventType: event.type, customer: object.customer, subscription: object.subscription },
      });
    }

    if (event.type === "customer.subscription.created") {
      const priceId = (object as Stripe.Subscription).items.data[0]?.price.id;
      await syncAccountTier(object.customer as string, priceId, { resetLock: true });

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
        meta: { eventType: event.type, customer: object.customer, status: object.status },
      });
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = object as Stripe.Subscription;
      const newPriceId = subscription.items.data[0]?.price.id;
      const previousPriceId = (event.data.previous_attributes as any)?.items?.data?.[0]?.price?.id;
      const wasEnterprise = previousPriceId === process.env.STRIPE_PRICE_ENTERPRISE;
      const isEnterprise = newPriceId === process.env.STRIPE_PRICE_ENTERPRISE;
      const isDowngradeFromEnterprise = wasEnterprise && !isEnterprise;

      await syncAccountTier(
        object.customer as string,
        newPriceId,
        isDowngradeFromEnterprise ? { lockDowngrade: true } : { resetLock: isEnterprise }
      );

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
        meta: { eventType: event.type, customer: object.customer, status: object.status },
      });
    }

    if (event.type === "customer.subscription.deleted") {
      await syncAccountTier(object.customer as string, null);

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
        meta: { eventType: event.type, customer: object.customer, status: object.status },
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

export type ResolvedBillingPlan = PlanKey | "free";

export function resolvePlanKeyFromStripePriceId(
  priceId: string | null | undefined
): ResolvedBillingPlan {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PRICE_PROTOCOL_AUTH)  return PLAN_KEYS.COMMAND;
  if (priceId === process.env.STRIPE_PRICE_MARKET_VISION)  return PLAN_KEYS.ENTERPRISE;
  if (priceId === process.env.STRIPE_PRICE_ENTERPRISE)     return PLAN_KEYS.ENTERPRISE;
  if (priceId === process.env.STRIPE_PRICE_PRO)            return PLAN_KEYS.PRO;
  if (priceId === process.env.STRIPE_PRICE_STARTER)        return PLAN_KEYS.STARTER;
  return PLAN_KEYS.PRO;
}

export async function getCurrentPlanKey(): Promise<ResolvedBillingPlan> {
  const status = await getCurrentBillingStatus();
  const priceId = status.subscription?.items?.[0]?.priceId ?? null;
  return resolvePlanKeyFromStripePriceId(priceId);
}

export async function getCurrentPlanTier(): Promise<"free" | "pro"> {
  const key = await getCurrentPlanKey();
  if (key === "free") return "free";
  return "pro";
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
