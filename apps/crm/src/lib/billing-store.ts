import Stripe from "stripe";
import { autoErrorCapture } from "./auto-error-capture";
import { createActivity } from "@/lib/activities-store";
import { PLAN_KEYS, PLAN_LIMITS, type PlanKey } from "@/lib/billing-types";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { logInfo } from "./logger";

// Mapovanie tier â†’ ui_role
const TIER_TO_UI_ROLE: Record<string, string> = {
  free:                "agent",
  starter:             "agent",
  pro:                 "agent",
  enterprise:          "owner_vision",
  market_vision:       "owner_vision",
  command:             "owner_protocol",
  protocol_authority:  "owner_protocol",
};

// PomocnĂˇ funkcia â€“ zapĂ­Ĺˇe account_tier + ui_role do profiles
// Preferuje authUserId z metadĂˇt, fallback na stripe_customer_id
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
    // Fallback â€“ hÄľadaj cez email zĂˇkaznĂ­ka zo Stripe
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
      // Stripe alebo Supabase lookup zlyhal â€“ tier ostĂˇva nezmenenĂ˝
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
  // â”€â”€ SMART START â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    key: PLAN_KEYS.STARTER,
    landingName: "Smart Start",
    name: "Smart Start",
    priceId: process.env.STRIPE_PRICE_STARTER || "",
    priceLabel: "49 â‚¬ / mesiac",
    description:
      "IdeĂˇlny Ĺˇtart pre samostatnĂ˝ch maklĂ©rov. AI Asistent odpovedĂˇ poÄŤas pracovnĂ˝ch hodĂ­n, Buyer Readiness Index prioritizuje tvoje prĂ­leĹľitosti a dennĂ˝ briefing ti povie ÄŤo robiĹĄ kaĹľdĂ© rĂˇno. VĂ¤ÄŤĹˇina maklĂ©rov vidĂ­ prvĂ© vĂ˝sledky do 7 dnĂ­.",
    billingNote: "FakturovanĂ© mesaÄŤne Â· ZruĹˇenie kedykoÄľvek Â· Do 3 maklĂ©rov Â· Podpora 48h",
    recommended: false,
    features: [
      "Do 3 maklĂ©rov v tĂ­me",
      "Do 100 prĂ­leĹľitostĂ­ mesaÄŤne",
      "đź¤– AI Asistent â€“ odpovede do 2 minĂşt (pracovnĂ© hodiny)",
      "đź“Š Buyer Readiness Index â€“ AI skĂłre kaĹľdej prĂ­leĹľitosti",
      "đź“± WhatsApp + SMS automatickĂ© odpovede",
      "đźŹ  Auto-pĂˇrovanie prĂ­leĹľitostĂ­ s nehnuteÄľnosĹĄami (do 10/mes)",
      "đź“§ AI email skripty â€“ personalizovanĂ© podÄľa sprĂˇvania klienta",
      "âšˇ One-click follow-up â€“ AI Asistent navrhne sprĂˇvu, ty schvĂˇliĹˇ",
      "đź“‹ DennĂ˝ AI briefing â€“ 5 priorĂ­t kaĹľdĂ© rĂˇno o 8:00",
      "đź”” Hot Alert â€“ notifikĂˇcia keÄŹ prĂ­leĹľitosĹĄ dosiahne skĂłre 75+",
      "đź“ ZĂˇkladnĂˇ analytika konverziĂ­ (tĂ˝ĹľdennĂ˝ report)",
      "đźŽ“ Revolis Academy â€“ prĂ­stup k freemium modulom (5 lekciĂ­)",
      "âś… Revolis.AI Certified Agent certifikĂˇt",
      "đź›ˇ 100% garancia vrĂˇtenia do 30 dnĂ­",
    ],
    limits: PLAN_LIMITS.starter,
    founderPrice: true,
    founderNote: "ZakladateÄľskĂˇ cena â€“ prvĂ˝ch 20 kancelĂˇriĂ­",
  },
  // â”€â”€ ACTIVE FORCE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    key: PLAN_KEYS.PRO,
    landingName: "Active Force",
    name: "Active Force",
    priceId: process.env.STRIPE_PRICE_PRO || "",
    priceLabel: "99 â‚¬ / mesiac",
    originalPriceLabel: "198 â‚¬ / mesiac",
    description:
      "PlnĂ˝ AI arzenĂˇl pre aktĂ­vneho maklĂ©ra. Sofia AI 24/7, prediktĂ­vny scoring, hovorovĂˇ analĂ˝za a automatickĂ© follow-upy.",
    billingNote: "1 maklĂ©r Â· PlnĂ˝ AI prĂ­stup Â· ZruĹˇenie kedykoÄľvek",
    recommended: true,
    features: [
      "1 maklĂ©rska licencia",
      "đź¤– AI Asistent 24/7 â€“ odpovede aj v noci",
      "đź§  PrediktĂ­vne skĂłrovanie obchodov",
      "đź“ž AI analĂ˝za hovorov",
      "đźŽŻ Detekcia zĂˇujmu klienta",
      "âšˇ AutomatickĂ© follow-upy (7-dĹovĂ© sekvencie)",
      "đź—ş TeritoriĂˇlna inteligencia",
      "đź“Š PredpoveÄŹ obratu",
      "đź”— PortĂˇlovĂ© integrĂˇcie",
      "đź›ˇ 30-dĹovĂˇ garancia vrĂˇtenia",
    ],
    limits: PLAN_LIMITS.pro,
    founderPrice: true,
    founderNote: "ZakladateÄľskĂˇ cena â€“ prvĂ˝ch 20 kancelĂˇriĂ­",
  },
  // â”€â”€ MARKET VISION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    key: PLAN_KEYS.ENTERPRISE,
    landingName: "Market Vision",
    name: "Market Vision",
    priceId: process.env.STRIPE_PRICE_MARKET_VISION || "",
    priceLabel: "199 â‚¬ / mesiac",
    originalPriceLabel: "398 â‚¬ / mesiac",
    description:
      "TĂ­movĂˇ licencia pre majiteÄľa kancelĂˇrie. Owner dostane Market Vision menu s prehÄľadom tĂ­mu, 1 maklĂ©r dostane Active Force prĂ­stup.",
    billingNote: "1 owner + 1 Active Force maklĂ©r Â· TĂ­movĂˇ licencia",
    recommended: false,
    features: [
      "đź‘‘ Owner: Market Vision menu",
      "âś… Kto je pripravenĂ˝ kĂşpiĹĄ",
      "âś… Dnes uzavriem",
      "1Ă— Active Force licencia pre maklĂ©ra",
      "đź“Š PrehÄľad vĂ˝konnosti tĂ­mu",
      "đź”Ť PrebĂşdza starĂ˝ch klientov, ktorĂ­ ĹĄa zabudli kontaktovaĹĄ",
      "đź“‹ ManaĹľĂ©rske reporty",
      "đź§  TĂ­movĂ˝ AI mozog",
      "đźŽŻ Hodnotenie vĂ˝konnosti maklĂ©rov",
      "đź“ PredpoveÄŹ obratu pre tĂ­m",
      "âšˇ PrioritnĂˇ podpora",
      "đź›ˇ 30-dĹovĂˇ garancia vrĂˇtenia",
    ],
    limits: PLAN_LIMITS.enterprise,
    founderPrice: true,
    founderNote: "ZakladateÄľskĂˇ cena â€“ prvĂ˝ch 20 kancelĂˇriĂ­",
  },
  // â”€â”€ PROTOCOL AUTHORITY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    key: PLAN_KEYS.COMMAND,
    landingName: "Protocol Authority",
    name: "Protocol Authority",
    priceId: process.env.STRIPE_PRICE_PROTOCOL_AUTH || "",
    priceLabel: "449 â‚¬ / mesiac",
    originalPriceLabel: "898 â‚¬ / mesiac",
    description:
      "NajvyĹˇĹˇia ĂşroveĹ. Owner mĂˇ Protocol Authority menu s Competition Heatmap a Neural Intelligence. 4 maklĂ©ri dostanĂş Active Force prĂ­stup.",
    billingNote: "1 Protocol Authority owner + 4 Active Force maklĂ©ri",
    recommended: false,
    features: [
      "đź‘‘ Owner: Protocol Authority menu",
      "âś… Kto je pripravenĂ˝ kĂşpiĹĄ",
      "âś… Dnes uzavriem",
      "4Ă— Active Force licencie pre maklĂ©rov",
      "đź—ş TepelnĂˇ mapa konkurencie â€“ ĹľivĂ˝ radar",
      "đź‘» PrebĂşdza starĂ˝ch klientov, ktorĂ­ ĹĄa zabudli kontaktovaĹĄ â€“ pokroÄŤilĂ˝ reĹľim",
      "đź›ˇ Ĺ tĂ­t anonymnĂ©ho reĹľimu",
      "đź§  NeurĂłnovĂˇ spravodajskĂˇ sieĹĄ",
      "đź“Š MedzitrĂ­movĂˇ analytika",
      "đźŹ˘ SprĂˇva viacerĂ˝ch poboÄŤiek",
      "âŽ DedikovanĂ˝ Protocol manaĹľĂ©r",
      "âšˇ SLA 99.99% uptime",
      "đź›ˇ 30-dĹovĂˇ garancia vrĂˇtenia",
    ],
    limits: PLAN_LIMITS.command,
    founderPrice: true,
    founderNote: "ZakladateÄľskĂˇ cena â€“ prvĂ˝ch 20 kancelĂˇriĂ­",
  },
] as const;

export async function createBillingCheckoutSession(planKey: string, promoCode?: string) {
  const stripe = getStripe();
  if (!stripe) {
    // Stripe nie je nakonfigurovanĂ˝, vrĂˇĹĄ null alebo vyhoÄŹ ĹˇpecifickĂş chybu podÄľa potreby
    return null;
  }
  const { getCurrentUser, getCurrentProfile } = await loadAuthHelpers();
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  if (!user?.email) {
    throw new Error("PouĹľĂ­vateÄľ nemĂˇ email.");
  }

  const plan = BILLING_PLANS.find((item) => item.key === planKey);

  if (!plan || !plan.priceId) {
    throw new Error("NeplatnĂ˝ plan alebo chĂ˝ba Stripe price ID.");
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
    // Ak priĹˇiel promo kĂłd z URL, aplikuj coupon â€” inak zobraz pole pre kĂłd
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
    // user nemĂˇ Stripe customer â€“ NIE je to 500 error, ale stav
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
        title: "Checkout session dokonÄŤenĂˇ",
        text: `Stripe checkout bol ĂşspeĹˇne dokonÄŤenĂ˝ pre ${object.customer_email || "zĂˇkaznĂ­ka"}.`,
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
        title: "PredplatnĂ© bolo vytvorenĂ©",
        text: `Vzniklo novĂ© Stripe predplatnĂ© ${object.id}.`,
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
      const wasEnterprise =
        previousPriceId === process.env.STRIPE_PRICE_ENTERPRISE ||
        previousPriceId === process.env.STRIPE_PRICE_MARKET_VISION;
      const isEnterprise =
        newPriceId === process.env.STRIPE_PRICE_ENTERPRISE ||
        newPriceId === process.env.STRIPE_PRICE_MARKET_VISION;
      const isDowngradeFromEnterprise = wasEnterprise && !isEnterprise;

      await syncAccountTier(
        object.customer as string,
        newPriceId,
        isDowngradeFromEnterprise ? { lockDowngrade: true } : { resetLock: isEnterprise }
      );

      await createActivity({
        leadId: null,
        type: "Billing",
        title: "PredplatnĂ© bolo upravenĂ©",
        text: `Stripe predplatnĂ© ${object.id} bolo aktualizovanĂ© na stav ${object.status}.`,
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
        title: "PredplatnĂ© bolo zruĹˇenĂ©",
        text: `Stripe predplatnĂ© ${object.id} bolo zruĹˇenĂ©.`,
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
        title: "FaktĂşra bola uhradenĂˇ",
        text: `Stripe faktĂşra ${object.id} bola ĂşspeĹˇne uhradenĂˇ.`,
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
        title: "Platba za faktĂşru zlyhala",
        text: `Platba za Stripe faktĂşru ${object.id} zlyhala.`,
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
    throw new Error("ChĂ˝ba STRIPE_WEBHOOK_SECRET.");
  }
  if (!stripe) {
    throw new Error("Stripe client nie je inicializovanĂ˝.");
  }
  return stripe.webhooks.constructEvent(payload, signature, secret);
}


