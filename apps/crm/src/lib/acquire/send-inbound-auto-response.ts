import { Resend } from "resend";

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
};

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

export type SendInboundAutoResponseResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Transport only — plain-text SK template via Resend.
 * Reply-To must be a real agency contact (never noreply).
 */
export async function sendInboundAutoResponse(
  payload: InboundAutoResponsePayload,
): Promise<SendInboundAutoResponseResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey?.startsWith("re_")) {
    return { ok: false, error: "RESEND_API_KEY missing or invalid" };
  }

  const replyTo = payload.replyTo.trim();
  if (!replyTo) {
    return { ok: false, error: "replyTo is required" };
  }

  const { subject, body, agentName } = buildInboundAutoResponseContent(payload);
  const fromEmail = resolveInboundFromEmail(replyTo);
  const resend = new Resend(apiKey);

  const result = await resend.emails.send({
    from: formatInboundFromAddress(agentName, fromEmail),
    to: payload.to,
    replyTo,
    subject,
    text: body,
  });

  if (result.error) {
    return { ok: false, error: result.error.message ?? "Resend send failed" };
  }

  return { ok: true };
}
