import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gatherAgencyActivationSnapshot, listNewAgenciesForActivation } from "./gather-snapshot";
import { renderActivationEmail } from "./email-render";
import { pickActivationEmailNode } from "./sequence";
import {
  getActivationFromEmail,
  getActivationReplyTo,
  getFounderInboxEmails,
  isOnboardingEmailsEnabled,
} from "./flags";
import { classifyActivationState } from "./health";
import type { ActivationEmailNode } from "./types";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

async function listSentNodes(admin: SupabaseClient, agencyId: string): Promise<Set<string>> {
  const { data } = await admin
    .from("activation_email_events")
    .select("node")
    .eq("agency_id", agencyId)
    .in("status", ["sent", "founder_draft"]);

  return new Set((data ?? []).map((r) => r.node as string));
}

async function alreadySentToday(
  admin: SupabaseClient,
  agencyId: string,
): Promise<boolean> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const { count } = await admin
    .from("activation_email_events")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", agencyId)
    .eq("status", "sent")
    .gte("sent_at", start.toISOString());

  return (count ?? 0) > 0;
}

async function logEvent(
  admin: SupabaseClient,
  input: {
    agencyId: string;
    node: ActivationEmailNode;
    activationState: string;
    recipientEmail: string;
    subject: string;
    status: "sent" | "suppressed" | "skipped_flag" | "founder_draft";
    meta?: Record<string, unknown>;
  },
): Promise<void> {
  await admin.from("activation_email_events").insert({
    agency_id: input.agencyId,
    node: input.node,
    activation_state: input.activationState,
    recipient_email: input.recipientEmail,
    subject: input.subject,
    status: input.status,
    meta: input.meta ?? {},
  });
}

export interface ActivationDispatchResult {
  agenciesScanned: number;
  emailsSent: number;
  founderDrafts: number;
  suppressed: number;
  skippedFlag: boolean;
  errors: string[];
}

export async function runActivationEmailDispatch(
  admin: SupabaseClient,
): Promise<ActivationDispatchResult> {
  const result: ActivationDispatchResult = {
    agenciesScanned: 0,
    emailsSent: 0,
    founderDrafts: 0,
    suppressed: 0,
    skippedFlag: false,
    errors: [],
  };

  if (!isOnboardingEmailsEnabled()) {
    result.skippedFlag = true;
    return result;
  }

  const resend = getResend();
  if (!resend) {
    result.errors.push("RESEND_API_KEY missing");
    return result;
  }

  const agencyIds = await listNewAgenciesForActivation(admin);
  result.agenciesScanned = agencyIds.length;

  for (const agencyId of agencyIds) {
    try {
      const snapshot = await gatherAgencyActivationSnapshot(admin, agencyId);
      if (!snapshot) continue;

      const sentNodes = await listSentNodes(admin, agencyId);
      const decision = pickActivationEmailNode(snapshot, sentNodes);
      if (!decision.node) continue;

      if (await alreadySentToday(admin, agencyId)) {
        result.suppressed += 1;
        await logEvent(admin, {
          agencyId,
          node: decision.node,
          activationState: decision.state,
          recipientEmail: snapshot.ownerEmail,
          subject: "(suppressed same day)",
          status: "suppressed",
          meta: { reason: decision.reason },
        });
        continue;
      }

      const rendered = renderActivationEmail(decision.node, snapshot);

      if (decision.founderDraftOnly) {
        const founders = getFounderInboxEmails();
        if (founders.length === 0) {
          result.errors.push(`founder_inbox_missing for ${agencyId}`);
          continue;
        }
        for (const to of founders) {
          await resend.emails.send({
            from: getActivationFromEmail(),
            to,
            replyTo: getActivationReplyTo(),
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.plaintext,
          });
        }
        result.founderDrafts += 1;
        await logEvent(admin, {
          agencyId,
          node: decision.node,
          activationState: decision.state,
          recipientEmail: founders.join(","),
          subject: rendered.subject,
          status: "founder_draft",
          meta: { customer: snapshot.ownerEmail },
        });
        continue;
      }

      await resend.emails.send({
        from: getActivationFromEmail(),
        to: snapshot.ownerEmail,
        replyTo: getActivationReplyTo(),
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.plaintext,
        headers: {
          "List-Unsubscribe": `<${process.env.NEXT_PUBLIC_APP_URL || "https://app.revolis.ai"}/api/activation/unsubscribe?agency=${agencyId}>`,
        },
      });

      result.emailsSent += 1;
      await logEvent(admin, {
        agencyId,
        node: decision.node,
        activationState: decision.state,
        recipientEmail: snapshot.ownerEmail,
        subject: rendered.subject,
        status: "sent",
        meta: { reason: decision.reason },
      });
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  return result;
}

/** Denne: súhrn rizikových účtov pre Andyho (Brief 8 health-check). */
export async function buildActivationHealthSummary(admin: SupabaseClient): Promise<{
  atRisk: Array<{ agencyId: string; name: string; state: string; days: number }>;
}> {
  const agencyIds = await listNewAgenciesForActivation(admin);
  const atRisk: Array<{ agencyId: string; name: string; state: string; days: number }> = [];

  for (const agencyId of agencyIds) {
    const snapshot = await gatherAgencyActivationSnapshot(admin, agencyId);
    if (!snapshot) continue;
    const state = classifyActivationState(snapshot);
    if (state === "S4" || (snapshot.daysSinceSignup >= 3 && state === "S0")) {
      atRisk.push({
        agencyId,
        name: snapshot.agencyName,
        state,
        days: snapshot.daysSinceSignup,
      });
    }
  }

  return { atRisk };
}
