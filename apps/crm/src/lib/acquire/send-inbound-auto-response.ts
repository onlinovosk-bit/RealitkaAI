import { Resend } from "resend";
import { safeErrorName, type AutoResponseSendReason } from "@/lib/acquire/auto-response-outcome";

export type InboundAutoResponsePayload = {
  to: string;
  leadName: string;
  agencyName: string;
  agencyPhone?: string | null;
  replyTo: string;
  assignedAgent?: string | null;
  /**
   * Zámerne tu NIE JE `aiReason`. To je interné zdôvodnenie AI triedenia („Generická správa bez
   * identifikácie konkrétnej nehnuteľnosti…"), nie popis toho, čo klient hľadá — vložené do e-mailu
   * dalo vetu „Viem, že hľadáte generická správa…" a prezrádzalo klientovi interné poznámky
   * (zachytené 1. 10. 2026 v Resend Logs pred odoslaním; e-mail nikdy neodišiel).
   */
  aiPriority?: string | null;
  source?: string | null;
  /**
   * ENGAGEMENT-EMAIL-01 — bez tagu sa otvorenie tohto e-mailu nedá priradiť
   * k leadu. Resend vráti tagy späť vo webhooku `email.opened`; `lead_id` je
   * jediné, čím sa dá udalosť naviazať. Voliteľné, aby volajúci bez leadu
   * (test, preview) ostali nedotknutí — vtedy sa e-mail pošle bez tagu
   * a engagement sa z neho nezachytí.
   */
  leadId?: string | null;
};

/**
 * Resend povoľuje v tagoch len ASCII písmená, číslice, `_` a `-`.
 * Id leadu je `text`, takže nemusí byť UUID — radšej overíme, než aby celé
 * odoslanie spadlo na tagu.
 */
const RESEND_TAG_VALUE = /^[A-Za-z0-9_-]+$/;

const DEFAULT_FROM_EMAIL = "onboarding@mg.revolis.ai";

/** Extract bare email from env (supports `Name <addr>`). */
export function extractSenderEmail(fromEnv: string): string {
  const trimmed = fromEnv.trim();
  const bracket = trimmed.match(/<([^>]+)>/);
  if (bracket?.[1]) return bracket[1].trim();
  return trimmed;
}

export function formatInboundFromAddress(displayName: string, fromEmail: string): string {
  const safeName = displayName.trim() || "Realitná kancelária";
  return `${safeName} <${fromEmail}>`;
}

/** Use agency reply-to as From when on verified Revolis domain; else verified outreach sender. */
export function resolveInboundFromEmail(replyTo: string): string {
  const replyDomain = replyTo.split("@")[1]?.toLowerCase() ?? "";
  if (replyDomain === "revolis.ai" || replyDomain.endsWith(".revolis.ai")) {
    return replyTo;
  }

  const outreach = process.env.OUTREACH_FROM_EMAIL?.trim();
  const outreachEmail = outreach ? extractSenderEmail(outreach) : "";
  if (outreachEmail && !outreachEmail.toLowerCase().startsWith("noreply@")) {
    return outreachEmail;
  }

  return DEFAULT_FROM_EMAIL;
}

// --- ŠABLÓNA: Variant A (teplý maklér) ---
//
// Obsahuje IBA overené fakty: oslovenie (len ak vyzerá ako meno), portál, čas odpovede podľa
// priority a kontakt. Nič z AI zdôvodnenia ani z textu správy klienta. Formulácie sú rodovo
// neutrálne („dopyt mi prišiel", „ozvem sa") — meno makléra môže byť mužské aj ženské.

/** Meno sa použije v osloveniu len ak vyzerá ako meno (nie e-mail, telefón, „Unknown"…). */
const GREETING_NAME_RE = /^[\p{L}][\p{L}\p{M}'.\- ]{0,58}$/u;
const GREETING_NAME_DENYLIST = new Set([
  "unknown", "neznámy", "neznamy", "neznáma", "neznama", "anonym", "anonymný", "n/a", "test",
]);

export function safeGreetingName(name: string | null | undefined): string {
  // Zalomenie riadku ani tabulátor v poli „meno" nie je meno (vložený text) — GREETING_NAME_RE ich
  // nepustí, preto sa medzery zlučujú len medzi znakmi " ", nie cez \s.
  const trimmed = (name ?? "").trim().replace(/ {2,}/g, " ");
  if (!trimmed || !GREETING_NAME_RE.test(trimmed)) return "";
  if (GREETING_NAME_DENYLIST.has(trimmed.toLowerCase())) return "";
  return trimmed;
}

export function buildInboundAutoResponseContent(payload: InboundAutoResponsePayload): {
  subject: string;
  body: string;
  agentName: string;
} {
  const agencyName = payload.agencyName.trim() || "Realitná kancelária";
  const agencyPhone = payload.agencyPhone?.trim() || "";
  const rawAgent = payload.assignedAgent?.trim();
  const agentName = rawAgent && rawAgent !== "Nepriradený" ? rawAgent : agencyName;

  const responseTime =
    payload.aiPriority === "Vysoká"
      ? "dnes"
      : payload.aiPriority === "Stredná"
        ? "v najbližších hodinách"
        : "v priebehu dňa";

  const portalName = payload.source?.startsWith("portal:")
    ? payload.source.replace("portal:", "").trim()
    : null;

  const greetingName = safeGreetingName(payload.leadName);
  const greeting = greetingName ? `Dobrý deň, ${greetingName},` : "Dobrý deň,";
  const portalPart = portalName ? ` z portálu ${portalName}` : "";

  const replyTo = payload.replyTo.trim();
  const contactLine = agencyPhone
    ? `pokojne mi napíšte na ${replyTo} alebo zavolajte na ${agencyPhone}`
    : `pokojne mi napíšte na ${replyTo}`;

  const subject = `Váš dopyt bol prijatý — ${agentName}`;

  const body = `${greeting}

váš dopyt${portalPart} mi prišiel. Pozriem sa naň a ozvem sa vám ${responseTime}.

Ak medzitým chcete niečo doplniť alebo sa opýtať, ${contactLine}.

${agentName}${agencyPhone ? `\n${agencyPhone}` : ""}`;

  return { subject, body, agentName };
}

export function buildInboundAutoResponseText(payload: InboundAutoResponsePayload): string {
  return buildInboundAutoResponseContent(payload).body;
}

export function buildInboundAutoResponseSubject(payload: InboundAutoResponsePayload): string {
  return buildInboundAutoResponseContent(payload).subject;
}

/** Zlyhanie odoslania — iba kódy, nikdy text chyby (môže niesť adresu príjemcu). */
export type InboundAutoResponseFailure = {
  reason: AutoResponseSendReason;
  httpStatus: number | null;
  errorName: string | null;
  /** Doména odosielateľa (naša konfigurácia, nie osobný údaj) — bez nej sa príčina 403 musela hádať. */
  fromDomain?: string | null;
};

export type SendInboundAutoResponseResult =
  | { ok: true; fromDomain?: string | null }
  | { ok: false; error: string; failure: InboundAutoResponseFailure };

/**
 * Verejné poštové domény: Resend ich nikdy neoverí (nepatria nám), takže odoslanie z nich vždy
 * skončí 403. Zachytené 1. 10. 2026: `OUTREACH_FROM_EMAIL` vo Verceli niesol gmail.com adresu.
 */
export const PUBLIC_MAILBOX_DOMAINS: ReadonlySet<string> = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "msn.com",
  "yahoo.com", "icloud.com", "me.com", "proton.me", "protonmail.com",
  "azet.sk", "centrum.sk", "zoznam.sk", "post.sk", "pobox.sk", "seznam.cz", "email.cz",
]);

export function emailDomain(address: string): string {
  return address.split("@")[1]?.trim().toLowerCase() ?? "";
}

// `.{0,80}` (nie `[^.]*`): názov domény v správe obsahuje bodky („The domain mg.revolis.ai was not found").
const DOMAIN_NOT_VERIFIED_MESSAGE =
  /domain.{0,80}(is not verified|not verified|not found)|verify (your |the )?domain/i;
const NETWORK_MESSAGE =
  /fetch failed|ECONNRESET|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|socket hang up|connection error/i;

/**
 * Zaradí chybu z Resendu do kódu dôvodu. Správa sa použije len na zhodu so vzorom
 * (napr. „doména nie je overená"), do výstupu ide iba kód, HTTP status a názov chyby.
 */
export function classifyResendError(error: unknown): InboundAutoResponseFailure {
  const e = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : {};
  const name = typeof e.name === "string" ? e.name : null;
  const status = typeof e.statusCode === "number" ? e.statusCode : null;
  const message = typeof e.message === "string" ? e.message : "";
  const base = { httpStatus: status, errorName: safeErrorName(name) };

  if (name === "missing_api_key") return { ...base, reason: "config" };
  if (name === "invalid_api_key" || status === 401) return { ...base, reason: "auth" };
  if (DOMAIN_NOT_VERIFIED_MESSAGE.test(message)) return { ...base, reason: "domain_not_verified" };
  if (name === "invalid_from_address") return { ...base, reason: "invalid_from" };
  if (status === 403 || name === "restricted_api_key" || name === "invalid_access") {
    return { ...base, reason: "auth" };
  }
  if (
    status === 429 ||
    name === "rate_limit_exceeded" ||
    name === "daily_quota_exceeded" ||
    name === "monthly_quota_exceeded"
  ) {
    return { ...base, reason: "rate_limit" };
  }
  if (
    status === 400 ||
    status === 422 ||
    name === "validation_error" ||
    name === "invalid_parameter" ||
    name === "missing_required_field" ||
    name === "invalid_idempotent_request"
  ) {
    return { ...base, reason: "validation" };
  }
  if ((status !== null && status >= 500) || name === "internal_server_error" || name === "application_error") {
    return { ...base, reason: "server_error" };
  }
  return { ...base, reason: "unknown" };
}

/**
 * Transport only — plain-text SK template via Resend.
 * Reply-To must be a real agency contact (never noreply).
 */
export async function sendInboundAutoResponse(
  payload: InboundAutoResponsePayload,
): Promise<SendInboundAutoResponseResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey?.startsWith("re_")) {
    return {
      ok: false,
      error: "RESEND_API_KEY missing or invalid",
      failure: { reason: "config", httpStatus: null, errorName: null },
    };
  }

  const replyTo = payload.replyTo.trim();
  if (!replyTo) {
    return {
      ok: false,
      error: "replyTo is required",
      failure: { reason: "validation", httpStatus: null, errorName: null },
    };
  }

  const { subject, body, agentName } = buildInboundAutoResponseContent(payload);
  const fromEmail = resolveInboundFromEmail(replyTo);
  const fromDomain = emailDomain(fromEmail);

  // Odosielateľ na verejnej poštovej doméne by Resend aj tak odmietol (403) — zamietame skôr a s
  // jasným dôvodom, bez volania API.
  if (PUBLIC_MAILBOX_DOMAINS.has(fromDomain)) {
    return {
      ok: false,
      error: `From address uses a public mailbox domain (${fromDomain}) — set OUTREACH_FROM_EMAIL to a verified sending domain`,
      failure: { reason: "invalid_from", httpStatus: null, errorName: null, fromDomain },
    };
  }

  const resend = new Resend(apiKey);

  // Bez tagu sa otvorenie tohto e-mailu nedá priradiť k leadu
  // (ENGAGEMENT-EMAIL-01). Hodnota sa validuje, inak by na nej spadlo celé
  // odoslanie.
  const leadId = payload.leadId?.trim();
  const tags = leadId && RESEND_TAG_VALUE.test(leadId)
    ? [{ name: "lead_id", value: leadId }]
    : undefined;

  let result: Awaited<ReturnType<typeof resend.emails.send>>;
  try {
    result = await resend.emails.send({
      from: formatInboundFromAddress(agentName, fromEmail),
      to: payload.to,
      replyTo,
      subject,
      text: body,
      ...(tags ? { tags } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: message,
      failure: {
        reason: NETWORK_MESSAGE.test(message) ? "network" : "unknown",
        httpStatus: null,
        errorName: safeErrorName(error),
        fromDomain,
      },
    };
  }

  if (result.error) {
    return {
      ok: false,
      error: result.error.message ?? "Resend send failed",
      failure: { ...classifyResendError(result.error), fromDomain },
    };
  }

  return { ok: true, fromDomain };
}
