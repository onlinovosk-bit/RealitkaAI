"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { sendOnboardingEmail } from "@/lib/send-onboarding-email";
import { rateLimit } from "@/lib/rate-limit";
import {
  isSelfServeSignupEnabled,
  SELF_SERVE_CONSENT_VERSION,
  SELF_SERVE_ERROR_MESSAGES,
  SELF_SERVE_METADATA_FLAG,
  validateSelfServeForm,
} from "@/lib/signup/self-serve";

const SIGNUP_RATE_PER_HOUR_IP = 10;
const SIGNUP_RATE_PER_HOUR_EMAIL = 3;

function fail(code: string, email = ""): never {
  const msg = SELF_SERVE_ERROR_MESSAGES[code] ?? SELF_SERVE_ERROR_MESSAGES.unavailable;
  redirect(`/register?error=${encodeURIComponent(msg)}${email ? `&email=${encodeURIComponent(email)}` : ""}`);
}

/**
 * Samoobslužná registrácia (vlajka SELF_SERVE_SIGNUP_ENABLED). Formulár iba vytvorí auth účet
 * a pošle potvrdzovací e-mail; agentúru založí až callback po OVERENÍ e-mailu cez
 * `bootstrap_self_serve_agency` (service_role). Z formulára sa nikdy nezapisuje do agencies/profiles.
 */
async function registerSelfServe(formData: FormData) {
  const parsed = validateSelfServeForm(formData);
  if (!parsed.ok) {
    // honeypot: tvárime sa ako úspech, bot nedostane signál
    if (parsed.code === "bot") redirect("/register?sent=1");
    fail(parsed.code, String(formData.get("email") ?? ""));
  }
  const v = parsed.value;

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`signup:ip:${ip}`, SIGNUP_RATE_PER_HOUR_IP, 3_600_000),
    rateLimit(`signup:email:${v.email}`, SIGNUP_RATE_PER_HOUR_EMAIL, 3_600_000),
  ]);
  if (!byIp.allowed || !byEmail.allowed) fail("rate_limited", v.email);

  const supabase = await createClient();
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.revolis.ai").replace(/\/$/, "");
  const { error } = await supabase.auth.signUp({
    email: v.email,
    password: v.password,
    options: {
      emailRedirectTo: `${base}/auth/callback?next=${encodeURIComponent("/onboarding/step-1-vitaj")}`,
      data: {
        [SELF_SERVE_METADATA_FLAG]: true,
        full_name: v.fullName,
        phone: v.phone,
        agency_name: v.agencyName,
        plan_intent: v.planIntent,
        consent_version: SELF_SERVE_CONSENT_VERSION,
      },
    },
  });
  // Rovnaká odpoveď pre nový aj existujúci e-mail (žiadne vyzváranie, kto má účet).
  if (error && !/already|registered/i.test(error.message)) fail("unavailable", v.email);
  redirect(`/register?sent=1&email=${encodeURIComponent(v.email)}`);
}

/**
 * Public registration must not attach users to a shared/default agency.
 * Agency+team bootstrap requires a privileged path (service_role) — not implemented
 * in this PR (tenant-creation security boundary; founder GO required).
 * Until then: fail closed rather than write into the production Smolko tenant
 * (11111111-1111-1111-1111-111111111111).
 */
export async function register(formData: FormData) {
  if (isSelfServeSignupEnabled()) return registerSelfServe(formData);
  const supabase = await createClient();

  const fullName = String(formData.get("fullName") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const phone = String(formData.get("phone") ?? "");

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }

  const user = signUpData.user;

  if (user) {
    const { data: existingByUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!existingByUser) {
      const { data: existingByEmail } = await supabase
        .from("profiles")
        .select("id, agency_id")
        .eq("email", email)
        .maybeSingle();

      if (existingByEmail?.id) {
        // Link auth to an invite/pre-provisioned profile — do not invent role/agency
        // from a global profile count (that forced every signup to "agent").
        await supabase
          .from("profiles")
          .update({
            auth_user_id: user.id,
            full_name: fullName || email,
            phone: phone || null,
            is_active: true,
          })
          .eq("id", existingByEmail.id);
      } else {
        // No agency bootstrap mechanism exists for user-scoped clients (RLS: no
        // agencies INSERT policy). Do not fall back to Smolko UUID.
        redirect(
          `/register?error=${encodeURIComponent(
            "Registrácia je dočasne nedostupná: chýba bezpečné založenie agentúry. Kontaktujte podporu Revolis.",
          )}`,
        );
      }
      // Odoslanie welcome emailu
      try {
        await sendOnboardingEmail(
          "welcome",
          email,
          fullName || email,
          "https://app.revolis.ai/onboarding",
        );
      } catch (e) {
        // Log error, ale nespomaľuj registráciu
        console.error("Nepodarilo sa odoslať welcome email:", e);
      }
    }
  }

  redirect("/onboarding/step-1-vitaj");
}
