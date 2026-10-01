import { Resend } from "resend";
import { safeErrorName, type AutoResponseSendReason } from "@/lib/acquire/auto-response-outcome";

export type InboundAutoResponsePayload = {
  to: string;
  leadName: string;
  agencyName: string;
  agencyPhone?: string | null;
  replyTo: string;
  assignedAgent?: string | null;
  aiReason?: string | null;
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

export function buildInboundAutoResponseContent(payload: InboundAutoResponsePayload): {
  subject: string;
  body: string;
  agentName: string;
} {
  const agencyName = payload.agencyName.trim() || "Realitná kancelária";
  const agencyPhone = payload.agencyPhone?.trim() || "";
  const rawAgent = payload.assignedAgent?.trim();
  const agentName = rawAgent && rawAgent !== "Nepriradený" ? rawAgent : agencyName;

  const aiReasonShort = payload.aiReason
    ? payload.aiReason.split(/[.!?]/)[0].slice(0, 80).trim()
    : null;

  const responseTime =
    payload.aiPriority === "Vysoká"
      ? "dnes"
      : payload.aiPriority === "Stredná"
        ? "v najbližších hodinách"
        : "v priebehu dňa";

  const portalName = payload.source?.startsWith("portal:")
    ? payload.source.replace("portal:", "")
    : null;

  const greeting = payload.leadName.trim() ? `Dobrý deň, ${payload.leadName.trim()},` : "Dobrý deň,";
  const portalPart = portalName ? ` z portálu ${portalName}` : "";
  const reasonPart = aiReasonShort
    ? `Viem, že hľadáte ${aiReasonShort.charAt(0).toLowerCase() + aiReasonShort.slice(1)} — pozriem sa na to a ozvem sa vám ${responseTime}.`
    : `Pozriem sa na to a ozvem sa vám ${responseTime}.`;

  const replyTo = payload.replyTo.trim();
  const contactLine = agencyPhone
    ? `pokojne mi napíšte na ${replyTo} alebo zavolajte na ${agencyPhone}`
    : `pokojne mi napíšte na ${replyTo}`;

  const subject = `Váš dopyt som dostal — ${agentName}`;

  const body = `${greeting}

dostal som váš dopyt${portalPart}. ${reasonPart}

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
};

export type SendInboundAutoResponseResult =
  | { ok: true }
  | { ok: false; error: string; failure: InboundAutoResponseFailure };

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
      },
    };
  }

  if (result.error) {
    return {
      ok: false,
      error: result.error.message ?? "Resend send failed",
      failure: classifyResendError(result.error),
    };
  }

  return { ok: true };
}
