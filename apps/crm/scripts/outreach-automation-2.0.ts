// Outreach Automation 2.0 Script
// Features: automatic sequences, scheduling, reply tracking, CRM integration

import { getLead, addLeadActivity, type Lead } from "@/lib/leads-store";
import { sendAiOutreachEmail } from "@/lib/outreach-store";
import { getFollowupTemplates } from "@/lib/followup-templates";
import { scheduleJob } from "@/lib/scheduler";
import { getRepliesForLead } from "@/lib/email-tracking";


// 1. Automatic Outreach Sequence
export async function runOutreachSequence(leadId: string) {
  const lead = await getLead(leadId);
  if (!lead) return;

  // Send initial outreach
  await sendAiOutreachEmail(leadId);
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
          await sendAiOutreachEmail(leadId, followup.templateId);
          await addLeadActivity(leadId, `Follow-up ${i + 1} sent`, "Email");
        }
      },
    });
  }
}

// 2. Scheduling (uses scheduleJob for all follow-ups)
// 3. Tracking Replies (uses getRepliesForLead before each follow-up)
// 4. CRM Integration (updates activities, lead status)

// Usage example:
// await runOutreachSequence("lead123");
