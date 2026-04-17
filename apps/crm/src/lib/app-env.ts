export function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Chýba env premenná: ${name}`);
  }

  return value;
}

export function getOptionalEnv(name: string) {
  return process.env[name] ?? null;
}

export type EnvHealthCheck = {
  key: string;
  label: string;
  required: boolean;
  present: boolean;
};

export type PilotSummary = {
  /** Odoslanie emailov priamo z API (playbook, outreach) — vyžaduje obe premenné */
  canSendTransactionalEmail: boolean;
  /** SMS cez Twilio z API */
  canSendSms: boolean;
  /** Verejná URL pre odkazy a webhooky */
  hasPublicAppUrl: boolean;
};

function twilioSmsConfigured(): boolean {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_SMS_FROM?.trim();
  return Boolean(sid && token && from);
}

/**
 * Diagnostika env na serveri (.build/run čas — bez hodnôt tajomstiev).
 * Rozšírené o odporúčané premenné pre prvého pilota (realitná kancelária).
 */
export function getEnvironmentHealth(): {
  checks: EnvHealthCheck[];
  requiredOk: boolean;
  mode: "connected" | "fallback";
  pilotSummary: PilotSummary;
} {
  const checks: EnvHealthCheck[] = [
    {
      key: "NEXT_PUBLIC_SUPABASE_URL",
      label: "Supabase URL",
      required: true,
      present: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    },
    {
      key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      label: "Supabase publishable key",
      required: false,
      present: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    },
    {
      key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      label: "Supabase anon key",
      required: false,
      present: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    },
    {
      key: "OPENAI_API_KEY",
      label: "OpenAI API key",
      required: false,
      present: Boolean(process.env.OPENAI_API_KEY),
    },
    {
      key: "NEXT_PUBLIC_APP_URL",
      label: "Verejná URL aplikácie (NEXT_PUBLIC_APP_URL)",
      required: false,
      present: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()),
    },
    {
      key: "RESEND_API_KEY",
      label: "Resend — API kľúč (transakčné emaily z CRM)",
      required: false,
      present: Boolean(process.env.RESEND_API_KEY?.trim()),
    },
    {
      key: "OUTREACH_FROM_EMAIL",
      label: "Resend — odosielateľ (OUTREACH_FROM_EMAIL)",
      required: false,
      present: Boolean(process.env.OUTREACH_FROM_EMAIL?.trim()),
    },
    {
      key: "TWILIO_SMS",
      label: "Twilio SMS (SID + token + TWILIO_SMS_FROM)",
      required: false,
      present: twilioSmsConfigured(),
    },
    {
      key: "STRIPE_SECRET_KEY",
      label: "Stripe — fakturácia (voliteľné pre pilot bez platieb)",
      required: false,
      present: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    },
  ];

  const requiredOk = checks
    .filter((item) => item.required)
    .every((item) => item.present);

  const resend = Boolean(process.env.RESEND_API_KEY?.trim());
  const from = Boolean(process.env.OUTREACH_FROM_EMAIL?.trim());

  const pilotSummary: PilotSummary = {
    canSendTransactionalEmail: resend && from,
    canSendSms: twilioSmsConfigured(),
    hasPublicAppUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()),
  };

  return {
    checks,
    requiredOk,
    mode: requiredOk ? "connected" : "fallback",
    pilotSummary,
  };
}
