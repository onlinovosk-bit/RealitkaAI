import { extractEmailDomain } from "./utm-parse";

export type CalendlyInviteePayload = {
  uri?: string;
  email?: string;
  name?: string;
  event?: string;
  created_at?: string;
  scheduled_event?: { start_time?: string; uri?: string };
  tracking?: {
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_content?: string | null;
    utm_term?: string | null;
  };
};

export function parseCalendlyInviteeCreated(body: unknown): {
  inviteeUri: string;
  eventUri: string | null;
  email: string;
  name: string;
  scheduledAt: string | null;
  tracking: CalendlyInviteePayload["tracking"];
} | null {
  if (!body || typeof body !== "object") return null;
  const root = body as { event?: string; payload?: CalendlyInviteePayload };
  if (root.event !== "invitee.created") return null;

  const p = root.payload;
  if (!p?.uri || !p.email) return null;

  const scheduledAt =
    p.scheduled_event?.start_time ??
    (typeof p.created_at === "string" ? p.created_at : null);

  return {
    inviteeUri: p.uri,
    eventUri: p.event ?? p.scheduled_event?.uri ?? null,
    email: p.email.trim().toLowerCase(),
    name: (p.name ?? "").trim(),
    scheduledAt,
    tracking: p.tracking ?? {},
  };
}

export function domainFromWebUrl(web: string | null | undefined): string | null {
  if (!web?.trim()) return null;
  try {
    const u = new URL(web.startsWith("http") ? web : `https://${web}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export { extractEmailDomain };
