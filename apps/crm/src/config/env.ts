import { z } from "zod";

const envSchema = z.object({
  // ── Core ─────────────────────────────────────────────────────
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // ── Supabase ─────────────────────────────────────────────────
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  // Kód akceptuje ktorýkoľvek z dvoch (getKey() v lib/supabase/*); vynucuje to superRefine nižšie.
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  // Voliteľné: createServiceRoleClient() vráti null → funkcia sa degraduje (viď DEGRADED_WITHOUT).
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // ── OpenAI / Anthropic ────────────────────────────────────────
  OPENAI_API_KEY: z.string().min(1).optional(), // getOpenAIClient() vracia null
  ANTHROPIC_API_KEY: z.string().optional(),
  OUTREACH_MODEL: z.string().default("gpt-4.1-mini"),
  OUTREACH_HIGH_QUALITY_MODEL: z.string().default("gpt-4.1"),
  OUTREACH_HIGH_QUALITY_MIN_SCORE: z.coerce.number().default(80),
  OUTREACH_MAX_OUTPUT_TOKENS: z.coerce.number().default(220),
  OUTREACH_MAX_BODY_CHARS: z.coerce.number().default(900),
  OUTREACH_DAILY_LIMIT: z.coerce.number().default(20),
  OUTREACH_ALLOWED_STATUSES: z.string().default("Ponuka,Záujem,Obhliadka"),
  OUTREACH_AB_SPLIT: z.coerce.number().default(0.5),
  OUTREACH_LEAD_COOLDOWN_HOURS: z.coerce.number().default(20),

  // ── Stripe ───────────────────────────────────────────────────
  STRIPE_SECRET_KEY: z.string().min(1).optional(), // app-env.ts: voliteľné pre pilot bez platieb
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_SCALE: z.string().optional(),
  STRIPE_PRICE_MARKET_VISION: z.string().optional(),
  STRIPE_PRICE_PROTOCOL_AUTH: z.string().optional(),
  STRIPE_PRICE_ENTERPRISE: z.string().optional(),
  STRIPE_PRICE_ONBOARDING: z.string().optional(),
  // Pricing stack v1.0 (program-tier-pricing.ts). Deklarované tu, aby schéma
  // hovorila pravdu o tom, čo aplikácia naozaj číta; drift stráži
  // tests/verification/stripe-expected-prices.verification.test.ts.
  STRIPE_PRICE_SOLO_SEAT: z.string().optional(),
  STRIPE_PRICE_TEAM_SEAT: z.string().optional(),
  STRIPE_PRICE_OFFICE_SEAT: z.string().optional(),
  STRIPE_PRICE_OWNER_COCKPIT: z.string().optional(),
  STRIPE_PRICE_OWNER_COCKPIT_FOUNDER: z.string().optional(),
  STRIPE_PRICE_CREDITS_START: z.string().optional(),
  STRIPE_PRICE_CREDITS_RAST: z.string().optional(),
  STRIPE_PRICE_CREDITS_PRO: z.string().optional(),
  STRIPE_PRICE_CREDITS_MEGA: z.string().optional(),
  STRIPE_PRICE_STARTER_PACK: z.string().optional(),

  // ── App URLs ─────────────────────────────────────────────────
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  APP_URL: z.string().url().optional(),

  // ── Email ────────────────────────────────────────────────────
  OUTREACH_FROM_EMAIL: z.string().email().default("info@onlinovo.sk"),
  EMAIL_PROVIDER: z.enum(["RESEND", "BREVO", "SMTP"]).default("RESEND"),
  RESEND_API_KEY: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_FROM_EMAIL: z.string().optional(),
  LEGAL_FROM_EMAIL: z.string().default("Revolis Legal <legal@revolis.ai>"),
  LEGAL_INBOX: z.string().default("legal@revolis.ai"),
  SUPPORT_FROM_EMAIL: z.string().default("Revolis Support <support@revolis.ai>"),
  SUPPORT_INBOX: z.string().default("support@revolis.ai"),
  NOTIFY_EMAIL: z.string().optional(),

  // ── Twilio ───────────────────────────────────────────────────
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_SMS_FROM: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),

  // ── Push Notifications ────────────────────────────────────────
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_EMAIL: z.string().default("mailto:support@revolis.ai"),

  // ── Google OAuth ─────────────────────────────────────────────
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_DEMO_ACCESS_TOKEN: z.string().optional(),

  // ── Feature Flags ────────────────────────────────────────────
  DECISION_ENGINE_ENABLED: z.coerce.boolean().default(false),
  CLOSING_WINDOW_ENABLED: z.coerce.boolean().default(false),
  RESCUE_AUTOMATION_ENABLED: z.coerce.boolean().default(false),

  // ── Cron / Jobs ──────────────────────────────────────────────
  CRON_SECRET: z.string().min(1).optional(), // isAuthorizedCronBearer je fail-closed pri chýbajúcom

  // ── Misc ─────────────────────────────────────────────────────
  NEXT_PUBLIC_MAP_STYLE_URL: z.string().url().optional(),
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().optional(), // deprecated — MapLibre + OpenFreeMap default
  NEXT_PUBLIC_REALTIME_SOCKET: z.string().optional(),
  NEXT_PUBLIC_LANDING_HERO_VARIANT: z.string().default("classic"),
  APP_TRIAL_DAYS: z.coerce.number().default(14),
  APP_GRACE_DAYS: z.coerce.number().default(7),
  LEAD_SCORE_SOURCE: z.string().default("crm"),
  CLEARBIT_API_KEY: z.string().optional(),
  META_ACCESS_TOKEN: z.string().optional(),
  META_AD_ACCOUNT_ID: z.string().optional(),
  CALENDAR_ICS_URL: z.string().url().optional(),
  SALES_CALENDAR_BOOKING_URL: z.string().url().optional(),
  LEGAL_WEBHOOK_URL: z.string().url().optional(),
  SUPPORT_WEBHOOK_URL: z.string().url().optional(),
  OPERATIONS_WEBHOOK_URL: z.string().url().optional(),
  ENTERPRISE_AI_INTELLIGENCE_DEV: z.string().optional(),
  USAGE_SYSTEM_AGENCY_ID: z.string().optional(),
  DEMO_PREFILL_ADMIN_TOKEN: z.string().optional(),
  IMPORT_TEST_API_KEY: z.string().optional(),
  E2E_BYPASS_AUTH: z.string().optional(),
  IMAP_HOST: z.string().optional(),
  IMAP_PORT: z.coerce.number().default(993),
  IMAP_SECURE: z.coerce.boolean().default(true),
  IMAP_USER: z.string().optional(),
  IMAP_PASSWORD: z.string().optional(),
}).superRefine((v, ctx) => {
  if (!v.NEXT_PUBLIC_SUPABASE_ANON_KEY && !v.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    ctx.addIssue({
      code: "custom",
      path: ["NEXT_PUBLIC_SUPABASE_ANON_KEY|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
      message: "Required (one of)",
    });
  }
});

/**
 * Premenné, bez ktorých app nabehne, ale konkrétna funkcia je mŕtva. Nie sú to
 * chyby schémy — logujú sa ako `degraded`, aby tichá degradácia bola viditeľná.
 */
export const DEGRADED_WITHOUT: Record<string, string> = {
  SUPABASE_SERVICE_ROLE_KEY: "cron, metriky, audit insert (createServiceRoleClient() = null)",
  CRON_SECRET: "cron/interné endpointy odmietajú všetky volania (fail-closed)",
  STRIPE_SECRET_KEY: "fakturácia a checkout",
  OPENAI_API_KEY: "Whisper prepis, embeddings, AI outreach",
};

export type Env = z.infer<typeof envSchema>;

export interface EnvIssue {
  key: string;
  message: string;
}

/**
 * Non-throwing check of `source` against the schema. Reports key NAMES and
 * zod's generic message only — never a received value (secrets).
 */
export function validateEnv(
  source: Record<string, string | undefined> = process.env,
): { ok: boolean; issues: EnvIssue[]; degraded: { key: string; feature: string }[] } {
  const degraded = Object.entries(DEGRADED_WITHOUT)
    .filter(([key]) => !source[key]?.trim())
    .map(([key, feature]) => ({ key, feature }));
  const result = envSchema.safeParse(source);
  if (result.success) return { ok: true, issues: [], degraded };
  return {
    ok: false,
    issues: result.error.issues.map((i) => ({ key: i.path.join("."), message: i.message })),
    degraded,
  };
}

/**
 * Strict accessor — throws on an invalid environment. Deliberately lazy: it used
 * to be a module-level `export const env = parseEnv()`, which nothing imported;
 * wiring that as-is would have taken production down on any variable Vercel
 * lacks today (measured 2026-10-01). Import this only after the schema has been
 * reconciled with production.
 */
export function getEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`[env] Invalid environment variables:\n${missing}`);
  }
  return result.data;
}
