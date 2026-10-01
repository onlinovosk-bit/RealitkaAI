import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  GUARDIAN_DIGEST_THROTTLE_HOURS,
  GUARDIAN_FINDINGS_TABLE,
  isGuardianDigestEnabled,
} from "@/lib/guardian/config";
import type { GuardianRuleCode } from "@/lib/guardian/types";
import { isCeoCommandOwner } from "@/lib/ceo-command/access";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.revolis.ai";

export type DigestCounts = Record<GuardianRuleCode, number>;

export function formatGuardianDigestEmail(input: {
  agencyName: string;
  counts: DigestCounts;
  openTotal: number;
  crmUrl?: string;
}): { subject: string; html: string; text: string } {
  const crmUrl = input.crmUrl ?? `${BASE_URL}/dashboard`;
  const lines = [
    `STALE: ${input.counts.STALE}`,
    `NO_OWNER: ${input.counts.NO_OWNER}`,
    `NO_PHONE: ${input.counts.NO_PHONE}`,
    `HOT_IGNORED: ${input.counts.HOT_IGNORED}`,
  ];
  const subject = `Revolis Guardian · ${input.openTotal} otvorených nálezov`;
  const text = [
    `Guardian — ${input.agencyName}`,
    "",
    ...lines,
    "",
    `Otvorené spolu: ${input.openTotal}`,
    `CRM: ${crmUrl}`,
  ].join("\n");

  const html = `<!DOCTYPE html><html lang="sk"><body style="font-family:sans-serif;color:#0F172A">
<p><strong>Guardian</strong> — ${input.agencyName}</p>
<ul>
<li>STALE: ${input.counts.STALE}</li>
<li>NO_OWNER: ${input.counts.NO_OWNER}</li>
<li>NO_PHONE: ${input.counts.NO_PHONE}</li>
<li>HOT_IGNORED: ${input.counts.HOT_IGNORED}</li>
</ul>
<p>Otvorené spolu: <strong>${input.openTotal}</strong></p>
<p><a href="${crmUrl}">Otvoriť CRM</a></p>
</body></html>`;

  return { subject, html, text };
}

/** Ensures digest body never embeds lead PII field names or patterns. */
export function assertDigestNoPii(payload: string): void {
  const forbidden = [/\bemail\b/i, /\bphone\b/i, /\btelefón/i, /\bmeno\b/i, /@/];
  for (const re of forbidden) {
    if (re.test(payload)) {
      throw new Error(`Guardian digest must not contain PII-like content: ${re}`);
    }
  }
}

function emptyCounts(): DigestCounts {
  return { STALE: 0, NO_OWNER: 0, NO_PHONE: 0, HOT_IGNORED: 0 };
}

export async function loadOpenFindingCounts(
  supabase: SupabaseClient,
  agencyId: string,
): Promise<{ counts: DigestCounts; openTotal: number; findingIds: string[] }> {
  const { data, error } = await supabase
    .from(GUARDIAN_FINDINGS_TABLE)
    .select("id, rule_code")
    .eq("agency_id", agencyId)
    .is("resolved_at", null);

  if (error) throw new Error(error.message);

  const counts = emptyCounts();
  const findingIds: string[] = [];
  for (const row of data ?? []) {
    const code = String(row.rule_code) as GuardianRuleCode;
    if (code in counts) counts[code] += 1;
    findingIds.push(String(row.id));
  }
  return { counts, openTotal: findingIds.length, findingIds };
}

export async function runGuardianDigestForAgency(
  supabase: SupabaseClient,
  agencyId: string,
): Promise<{ sent: boolean; reason?: string }> {
  if (!isGuardianDigestEnabled()) {
    return { sent: false, reason: "digest_disabled" };
  }

  const { data: openRows, error } = await supabase
    .from(GUARDIAN_FINDINGS_TABLE)
    .select("id, digest_sent_at")
    .eq("agency_id", agencyId)
    .is("resolved_at", null);

  if (error) return { sent: false, reason: error.message };

  const throttleMs = GUARDIAN_DIGEST_THROTTLE_HOURS * 60 * 60 * 1000;
  const pending = (openRows ?? []).filter((row) => {
    const sentAt = row.digest_sent_at ? Date.parse(String(row.digest_sent_at)) : null;
    if (sentAt === null || Number.isNaN(sentAt)) return true;
    return Date.now() - sentAt >= throttleMs;
  });

  if (!pending.length) return { sent: false, reason: "nothing_to_digest" };

  const { counts, openTotal, findingIds } = await loadOpenFindingCounts(supabase, agencyId);
  if (openTotal === 0) return { sent: false, reason: "no_open" };

  const { data: agency } = await supabase
    .from("agencies")
    .select("name")
    .eq("id", agencyId)
    .maybeSingle();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, role, ui_role")
    .eq("agency_id", agencyId);

  const owners = (profiles ?? []).filter((p) => isCeoCommandOwner(p));
  const emails = owners.map((p) => String(p.email ?? "").trim()).filter(Boolean);
  if (emails.length === 0) {
    return { sent: false, reason: "no_owner_email" };
  }

  const formatted = formatGuardianDigestEmail({
    agencyName: String(agency?.name ?? "Agentúra"),
    counts,
    openTotal,
  });
  assertDigestNoPii(formatted.text);
  assertDigestNoPii(formatted.html);

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return { sent: false, reason: "resend_missing" };
  }

  const resend = new Resend(resendKey);
  const from = process.env.RESEND_FROM_EMAIL ?? "Revolis <onboarding@resend.dev>";
  const now = new Date().toISOString();

  for (const to of emails) {
    await resend.emails.send({
      from,
      to,
      subject: formatted.subject,
      html: formatted.html,
      text: formatted.text,
    });
  }

  if (findingIds.length > 0) {
    await supabase
      .from(GUARDIAN_FINDINGS_TABLE)
      .update({ digest_sent_at: now })
      .in("id", findingIds);
  }

  return { sent: true };
}
