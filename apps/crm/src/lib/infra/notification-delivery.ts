import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { parseFounderEmails } from "@/lib/metrics/access";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.revolis.ai";

export type UnreadNotificationRow = {
  id: string;
  priority: string;
  title: string;
  type: string;
  created_at: string;
};

export type DigestSendResult = {
  sent: boolean;
  reason?: string;
  unreadCount: number;
  markedRead: number;
};

export type CriticalEmailResult = {
  sent: boolean;
  reason?: string;
};

/** Founder inboxes only — never customer agency owners. */
export function getFounderAlertEmails(): string[] {
  return parseFounderEmails(process.env.FOUNDER_EMAILS);
}

export function isNotificationDigestEnabled(): boolean {
  const raw = process.env.NOTIFICATION_DIGEST_ENABLED;
  if (raw === undefined || raw === "") return true;
  return !["0", "false", "off", "no"].includes(raw.trim().toLowerCase());
}

export function formatUnreadDigestEmail(input: {
  rows: UnreadNotificationRow[];
  crmUrl?: string;
}): { subject: string; html: string; text: string } {
  const crmUrl = input.crmUrl ?? `${BASE_URL}/dashboard`;
  const critical = input.rows.filter((r) => r.priority === "critical").length;
  const high = input.rows.filter((r) => r.priority === "high").length;
  const lines = input.rows.slice(0, 40).map((r) => {
    const when = r.created_at.slice(0, 16).replace("T", " ");
    return `[${r.priority}] ${when} · ${r.title}`;
  });
  const more =
    input.rows.length > 40 ? `\n… +${input.rows.length - 40} ďalších` : "";

  const subject = `Revolis Strážca prítoku · ${input.rows.length} neprečítaných (${critical} critical)`;
  const text = [
    `Neprečítané platformové alerty: ${input.rows.length}`,
    `critical: ${critical} · high: ${high}`,
    "",
    ...lines,
    more,
    "",
    `CRM: ${crmUrl}`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  const htmlItems = input.rows
    .slice(0, 40)
    .map(
      (r) =>
        `<li><strong>${escapeHtml(r.priority)}</strong> · ${escapeHtml(r.created_at.slice(0, 16))} · ${escapeHtml(r.title)}</li>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html lang="sk"><body style="font-family:sans-serif;color:#0F172A">
<p><strong>Strážca prítoku</strong> — denný digest neprečítaných alertov</p>
<p>Spolu: <strong>${input.rows.length}</strong> (critical ${critical}, high ${high})</p>
<ul>${htmlItems}</ul>
${input.rows.length > 40 ? `<p>… +${input.rows.length - 40} ďalších</p>` : ""}
<p><a href="${crmUrl}">Otvoriť CRM</a></p>
</body></html>`;

  return { subject, html, text };
}

export function formatCriticalAlertEmail(input: {
  signalId: string;
  title: string;
  detail: string;
  crmUrl?: string;
}): { subject: string; html: string; text: string } {
  const crmUrl = input.crmUrl ?? `${BASE_URL}/dashboard`;
  const subject = `Revolis CRITICAL · ${input.title}`;
  const text = [
    `CRITICAL heartbeat: ${input.title}`,
    "",
    input.detail,
    "",
    `signal: ${input.signalId}`,
    `CRM: ${crmUrl}`,
  ].join("\n");
  const html = `<!DOCTYPE html><html lang="sk"><body style="font-family:sans-serif;color:#0F172A">
<p><strong>CRITICAL</strong> — ${escapeHtml(input.title)}</p>
<p>${escapeHtml(input.detail)}</p>
<p style="color:#64748B;font-size:12px">signal: ${escapeHtml(input.signalId)}</p>
<p><a href="${crmUrl}">Otvoriť CRM</a></p>
</body></html>`;
  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendViaResend(input: {
  to: string[];
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return { ok: false, reason: "resend_missing" };
  if (input.to.length === 0) return { ok: false, reason: "no_founder_email" };

  const resend = new Resend(resendKey);
  const from = process.env.RESEND_FROM_EMAIL ?? "Revolis <onboarding@resend.dev>";
  for (const to of input.to) {
    await resend.emails.send({
      from,
      to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  }
  return { ok: true };
}

/** Immediate founder email for a newly persisted critical heartbeat signal. */
export async function sendCriticalHeartbeatEmail(input: {
  signalId: string;
  title: string;
  detail: string;
}): Promise<CriticalEmailResult> {
  const emails = getFounderAlertEmails();
  if (emails.length === 0) return { sent: false, reason: "no_founder_email" };

  const formatted = formatCriticalAlertEmail(input);
  const result = await sendViaResend({
    to: emails,
    subject: formatted.subject,
    html: formatted.html,
    text: formatted.text,
  });
  return result.ok ? { sent: true } : { sent: false, reason: result.reason };
}

/**
 * Daily digest of unread routine_notifications → FOUNDER_EMAILS.
 * Marks delivered rows read_at so unread count drops (no new column).
 */
export async function runUnreadNotificationDigest(
  supabase: SupabaseClient,
  options?: { limit?: number },
): Promise<DigestSendResult> {
  if (!isNotificationDigestEnabled()) {
    return { sent: false, reason: "digest_disabled", unreadCount: 0, markedRead: 0 };
  }

  const limit = options?.limit ?? 200;
  const { data, error } = await supabase
    .from("routine_notifications")
    .select("id, priority, title, type, created_at")
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { sent: false, reason: error.message, unreadCount: 0, markedRead: 0 };
  }

  const rows = (data ?? []) as UnreadNotificationRow[];
  if (rows.length === 0) {
    return { sent: false, reason: "nothing_to_digest", unreadCount: 0, markedRead: 0 };
  }

  const emails = getFounderAlertEmails();
  if (emails.length === 0) {
    return { sent: false, reason: "no_founder_email", unreadCount: rows.length, markedRead: 0 };
  }

  const formatted = formatUnreadDigestEmail({ rows });
  const send = await sendViaResend({
    to: emails,
    subject: formatted.subject,
    html: formatted.html,
    text: formatted.text,
  });
  if (!send.ok) {
    return {
      sent: false,
      reason: send.reason,
      unreadCount: rows.length,
      markedRead: 0,
    };
  }

  const now = new Date().toISOString();
  const ids = rows.map((r) => r.id);
  const { error: updateError } = await supabase
    .from("routine_notifications")
    .update({ read_at: now })
    .in("id", ids)
    .is("read_at", null);

  if (updateError) {
    return {
      sent: true,
      reason: `email_ok_mark_failed:${updateError.message}`,
      unreadCount: rows.length,
      markedRead: 0,
    };
  }

  return {
    sent: true,
    unreadCount: rows.length,
    markedRead: ids.length,
  };
}
