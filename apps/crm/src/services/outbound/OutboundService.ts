// src/services/outbound/OutboundService.ts

import type {
  OutboundCampaignRepository,
  OutboundContentBuilder,
  OutboundMessageRepository,
  OutboundRecipient,
} from "@/domain/outbound/OutboundCampaign";
import type { EmailSender } from "@/domain/outbound/OutboundCampaign";

export class OutboundService {
  constructor(
    private readonly campaigns: OutboundCampaignRepository,
    private readonly messages: OutboundMessageRepository,
    private readonly contentBuilder: OutboundContentBuilder,
    private readonly emailSender: EmailSender,
  ) {}

  async scheduleForTopAgencies(tenantId: string, limit = 50): Promise<number> {
    const activeCampaigns = await this.campaigns.getActive();
    if (!activeCampaigns.length) {
      console.log("[OutboundService] Žiadne aktívne kampane.");
      return 0;
    }

    const recipients: OutboundRecipient[] =
      await this.campaigns.getTopAgencyRecipients(limit, tenantId);

    if (!recipients.length) {
      console.log("[OutboundService] Žiadni príjemcovia s emailom.");
      return 0;
    }

    let total = 0;

    for (const campaign of activeCampaigns) {
      const plans = await Promise.all(
        recipients.map(async (r) => {
          const { subject, body } = await this.contentBuilder.buildMessage(r, campaign);
          return {
            campaignId: campaign.id,
            agencyId: r.agencyId,
            recipientEmail: r.email,
            recipientName: r.name,
            subject,
            body,
            sendAt: new Date(),
          };
        }),
      );

      await this.messages.scheduleBatch(plans);
      total += plans.length;
      console.log(`[OutboundService] Kampaň "${campaign.name}": naplánovaných ${plans.length} správ.`);
    }

    return total;
  }

  async sendDueEmails(now: Date, batchSize = 100): Promise<number> {
    const due = await this.messages.getDueMessages(now, batchSize);

    if (!due.length) {
      console.log("[OutboundService] Žiadne due správy.");
      return 0;
    }

    let sent = 0;

    for (const msg of due) {
      try {
        await this.emailSender.send(msg.recipientEmail, msg.subject, msg.body);
        await this.messages.markSent(msg.id);
        sent++;
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        console.error(`[OutboundService] Chyba pri odosielaní ${msg.id}: ${reason}`);
        await this.messages.markFailed(msg.id, reason);
      }
    }

    console.log(`[OutboundService] Odoslané: ${sent}/${due.length}`);
    return sent;
  }
}
