import { z } from "zod";

const envSchema = z.object({
  // ── Core ─────────────────────────────────────────────────────
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // ── Supabase ─────────────────────────────────────────────────
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // ── OpenAI / Anthropic ────────────────────────────────────────
  OPENAI_API_KEY: z.string().min(1),
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
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_SCALE: z.string().optional(),
  STRIPE_PRICE_MARKET_VISION: z.string().optional(),
  STRIPE_PRICE_PROTOCOL_AUTH: z.string().optional(),
  STRIPE_PRICE_ENTERPRISE: z.string().optional(),
  STRIPE_PRICE_ONBOARDING: z.string().optional(),

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
  CRON_SECRET: z.string().min(1),

  // ── Misc ─────────────────────────────────────────────────────
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().optional(),
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
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`[env] Invalid environment variables:\n${missing}`);
  }
  return result.data;
}

// Singleton — parsed once at module load, fails fast on startup
export const env = parseEnv();
