import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/admin";

/**
 * Samoobslužné založenie agentúry (SIGNUP-ARCH). Celé je za vlajkou `SELF_SERVE_SIGNUP_ENABLED`
 * (predvolene VYPNUTÉ, fail-closed). Agentúru zakladá výlučne SQL funkcia
 * `bootstrap_self_serve_agency` (SECURITY DEFINER, EXECUTE len service_role); aplikácia ju volá
 * až PO overení e-mailu (callback / confirm), nikdy priamo z registračného formulára.
 * Dokument: docs/architecture/2026-10-06-self-serve-signup.md
 */

/** Verzia súhlasu s VOP/GDPR; zmena textu = nová verzia (eviduje sa v account_signups). */
export const SELF_SERVE_CONSENT_VERSION = "2026-10-06";

export const SELF_SERVE_PLAN_INTENTS = ["start", "team", "office", "network"] as const;
export type SelfServePlanIntent = (typeof SELF_SERVE_PLAN_INTENTS)[number];

export const SELF_SERVE_METADATA_FLAG = "self_serve_signup";

type Env = Record<string, string | undefined>;

/** Zapína len výslovné `true` / `1` / `on`. */
export function isSelfServeSignupEnabled(env: Env = process.env): boolean {
  const raw = env.SELF_SERVE_SIGNUP_ENABLED?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "on";
}

/** Dĺžka trialu: APP_TRIAL_DAYS (default 14), orezané na 0–60 (rovnaká hranica ako v SQL). */
export function selfServeTrialDays(env: Env = process.env): number {
  const n = Number(env.APP_TRIAL_DAYS ?? "14");
  if (!Number.isFinite(n)) return 14;
  return Math.min(Math.max(Math.trunc(n), 0), 60);
}

/**
 * Úvodné kredity trialu. Predvolene 0 — výšku určuje founder (SELF_SERVE_TRIAL_CREDITS),
 * kým ju nenastaví, nik nedostane nič zadarmo. Orezané na 0–200 (rovnaká hranica ako v SQL).
 */
export function selfServeTrialCredits(env: Env = process.env): number {
  const n = Number(env.SELF_SERVE_TRIAL_CREDITS ?? "0");
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(Math.trunc(n), 0), 200);
}

export function parsePlanIntent(value: unknown): SelfServePlanIntent | null {
  return typeof value === "string" && (SELF_SERVE_PLAN_INTENTS as readonly string[]).includes(value)
    ? (value as SelfServePlanIntent)
    : null;
}

export type SelfServeSignupInput = {
  fullName: string;
  phone: string;
  agencyName: string;
  planIntent: SelfServePlanIntent | null;
  consent: boolean;
  /** honeypot: skryté pole, ktoré človek nevyplní */
  website: string;
};

export type SelfServeValidation =
  | { ok: true; value: SelfServeSignupInput & { email: string; password: string } }
  | { ok: false; code: "bot" | "consent_required" | "invalid_email" | "weak_password" | "invalid_name" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateSelfServeForm(form: FormData): SelfServeValidation {
  const get = (k: string) => String(form.get(k) ?? "").trim();
  if (get("website") !== "") return { ok: false, code: "bot" };
  const email = get("email").toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) return { ok: false, code: "invalid_email" };
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { ok: false, code: "weak_password" };
  const fullName = get("fullName");
  const agencyName = get("agencyName");
  if (fullName.length < 2 || fullName.length > 120 || agencyName.length > 120) {
    return { ok: false, code: "invalid_name" };
  }
  if (form.get("consent") !== "on") return { ok: false, code: "consent_required" };
  return {
    ok: true,
    value: {
      email,
      password,
      fullName,
      phone: get("phone").slice(0, 40),
      agencyName,
      planIntent: parsePlanIntent(get("plan")),
      consent: true,
      website: "",
    },
  };
}

export const SELF_SERVE_ERROR_MESSAGES: Record<string, string> = {
  bot: "Registráciu sa nepodarilo dokončiť.",
  consent_required: "Pre vytvorenie účtu je potrebný súhlas s podmienkami.",
  invalid_email: "Zadajte platnú e-mailovú adresu.",
  weak_password: "Heslo musí mať aspoň 8 znakov.",
  invalid_name: "Skontrolujte meno a názov kancelárie.",
  rate_limited: "Príliš veľa pokusov. Skúste to o chvíľu.",
  unavailable: "Registrácia je dočasne nedostupná. Skúste neskôr alebo kontaktujte podporu.",
};

export type ProvisionResult =
  | { ok: true; created: boolean; agencyId: string }
  | { ok: false; error: string };

type MetadataUser = {
  id: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

/**
 * Vola sa po úspešnom overení e-mailu. Nerobí nič, ak vlajka je vypnutá alebo ak užívateľ
 * nepochádza zo samoobslužnej registrácie (metadáta nastavuje len náš formulár; aj keby ich niekto
 * sfalšoval, SQL funkcia znova overuje e-mail a súhlas a nikdy neprepíše existujúci profil).
 */
export async function provisionAfterEmailConfirmed(
  user: MetadataUser,
  deps: { env?: Env; admin?: SupabaseClient | null } = {},
): Promise<ProvisionResult | { ok: true; skipped: true }> {
  const env = deps.env ?? process.env;
  if (!isSelfServeSignupEnabled(env)) return { ok: true, skipped: true };
  const meta = user.user_metadata ?? {};
  if (meta[SELF_SERVE_METADATA_FLAG] !== true) return { ok: true, skipped: true };
  if (!user.email_confirmed_at) return { ok: false, error: "email_not_confirmed" };

  const admin = deps.admin === undefined ? createServiceRoleClient() : deps.admin;
  if (!admin) return { ok: false, error: "unavailable" };

  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const { data, error } = await admin.rpc("bootstrap_self_serve_agency", {
    p_auth_user_id: user.id,
    p_full_name: str(meta.full_name),
    p_phone: str(meta.phone),
    p_agency_name: str(meta.agency_name),
    p_plan_intent: parsePlanIntent(meta.plan_intent),
    p_consent_version: str(meta.consent_version),
    p_trial_days: selfServeTrialDays(env),
    p_trial_credits: selfServeTrialCredits(env),
  });
  if (error) {
    console.error("[self-serve] bootstrap failed:", error.message);
    return { ok: false, error: "unavailable" };
  }
  const row = data as { ok?: boolean; created?: boolean; agency_id?: string; error?: string } | null;
  if (!row?.ok || !row.agency_id) return { ok: false, error: row?.error ?? "unavailable" };
  return { ok: true, created: row.created === true, agencyId: row.agency_id };
}

/** Kam po prihlásení: s úmyslom plánu rovno na výber plánu, inak do onboardingu. */
export function postSignupDestination(planIntent: unknown): string {
  return parsePlanIntent(planIntent) ? `/upgrade?plan=${parsePlanIntent(planIntent)}` : "/onboarding/step-1-vitaj";
}

/**
 * Po overení e-mailu: kam presmerovať. Pre samoobslužný signup založí kanceláriu; pri zlyhaní
 * pošle späť na /register s chybou (účet je overený, ale bez kancelárie sa ďalej nejde).
 * Ostatné toky (reset hesla, prihlásenie) vracajú `defaultUrl` bez zmeny.
 */
export async function resolvePostConfirmUrl(
  origin: URL,
  user: MetadataUser | null | undefined,
  defaultUrl: URL,
  deps: Parameters<typeof provisionAfterEmailConfirmed>[1] = {},
): Promise<URL> {
  if (!user) return defaultUrl;
  const result = await provisionAfterEmailConfirmed(user, deps);
  if (!result.ok) {
    const failUrl = new URL("/register", origin);
    failUrl.searchParams.set(
      "error",
      "Účet je overený, ale kanceláriu sa nepodarilo založiť. Kontaktujte podporu Revolis.",
    );
    return failUrl;
  }
  if ("skipped" in result) return defaultUrl;
  return new URL(postSignupDestination(user.user_metadata?.plan_intent), origin);
}
