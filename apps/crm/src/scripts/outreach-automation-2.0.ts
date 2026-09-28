// Outreach Automation 2.0 Script
// Features: automatic sequences, scheduling, reply tracking, CRM integration

import type { SupabaseClient } from "@supabase/supabase-js";
import { addLeadActivity } from "../lib/leads-store";
import { resolveOutreachLead, sendAiOutreachEmail } from "../lib/outreach-store";
import { getFollowupTemplates } from "../lib/followup-templates";
import { scheduleJob } from "../lib/scheduler";
import { getRepliesForLead } from "../lib/email-tracking";

/**
 * 1. Automatic Outreach Sequence
 *
 * `client` must be threaded through from the caller: a request-scoped client
 * for user-triggered sends, a service-role client for cron. Called with no
 * client on the server, every lead lookup used to resolve to the browser
 * singleton and return nothing, so the whole sequence was a silent no-op.
 */
export async function runOutreachSequence(
  leadId: string,
  client?: SupabaseClient | null,
) {
  const lead = await resolveOutreachLead(leadId, client);
  if (!lead) return;

  // Send initial outreach
  await sendAiOutreachEmail(leadId, client);
  await addLeadActivity(leadId, "Outreach sent", "Email");

  // Schedule follow-ups
  const followups = await getFollowupTemplates();
  for (let i = 0; i < followups.length; i++) {
    const followup = followups[i];
    scheduleJob({
      runAt: Date.now() + followup.delayDays * 24 * 60 * 60 * 1000,
      job: async () => {
        // Check if lead replied
        const replies = await getRepliesForLead(leadId);
        if (replies.length === 0) {
          await sendAiOutreachEmail(leadId, client);
          await addLeadActivity(leadId, `Follow-up ${i + 1} sent`, "Email");
        }
      },
    });
  }
}
