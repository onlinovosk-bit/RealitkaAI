import { Resend } from "resend";

export type InboundAutoResponsePayload = {
  to: string;
  leadName: string;
  agencyName: string;
  agencyPhone?: string | null;
  replyTo: string;
};

/** Extract bare email from OUTREACH_FROM_EMAIL (supports `Name <addr>`). */
export function extractSenderEmail(fromEnv: string): string {
  const trimmed = fromEnv.trim();
  const bracket = trimmed.match(/<([^>]+)>/);
  if (bracket?.[1]) return bracket[1].trim();
  return trimmed;
}

export function formatInboundFromAddress(agencyName: string, fromEnv: string): string {
  const email = extractSenderEmail(fromEnv);
  const safeName = agencyName.trim() || "Realitná kancelária";
  return `${safeName} <${email}>`;
}

export function buildInboundAutoResponseText(payload: InboundAutoResponsePayload): string {
  const greeting = payload.leadName.trim()
    ? `Dobrý deň, ${payload.leadName.trim()},`
    : "Dobrý deň,";

  const phoneLine = payload.agencyPhone?.trim()
    ? `\nAk máte medzitým otázky, pokojne odpovedzte na tento e-mail\nalebo nám zavolajte na ${payload.agencyPhone.trim()}.\n`
    : "\nAk máte medzitým otázky, pokojne odpovedzte na tento e-mail.\n";

  return `${greeting}

ďakujeme za váš dopyt. Evidujeme ho a jeden z našich maklérov
sa vám ozve v najbližšom čase.
${phoneLine}
S pozdravom,
${payload.agencyName.trim() || "Realitná kancelária"}
`;
}

export function buildInboundAutoResponseSubject(agencyName: string): string {
  return `Ďakujeme za váš dopyt — ${agencyName.trim() || "Realitná kancelária"}`;
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

  const fromEnv = process.env.OUTREACH_FROM_EMAIL?.trim() || "noreply@revolis.ai";
  const resend = new Resend(apiKey);

  const result = await resend.emails.send({
    from: formatInboundFromAddress(payload.agencyName, fromEnv),
    to: payload.to,
    replyTo,
    subject: buildInboundAutoResponseSubject(payload.agencyName),
    text: buildInboundAutoResponseText(payload),
  });

  if (result.error) {
    return { ok: false, error: result.error.message ?? "Resend send failed" };
  }

  return { ok: true };
}
