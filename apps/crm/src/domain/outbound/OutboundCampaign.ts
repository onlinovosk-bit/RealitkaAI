// src/domain/outbound/OutboundCampaign.ts

export interface OutboundCampaign {
  id: string;
  name: string;
  channel: "email" | "sms" | "linkedin";
  status: "draft" | "active" | "paused" | "completed";
  tenantId: string;
  projectId: string;
}

export interface OutboundRecipient {
  agencyId: string;
  email: string;
  name: string;
}

export interface OutboundMessagePlan {
  recipientEmail: string;
  recipientName: string;
  agencyId: string;
  subject: string;
  body: string;
  sendAt: Date;
  campaignId: string;
}

export interface OutboundMessageWithId extends OutboundMessagePlan {
  id: string;
}

export interface EmailSender {
  send(to: string, subject: string, body: string): Promise<void>;
}

export interface OutboundMessageRepository {
  scheduleBatch(messages: OutboundMessagePlan[]): Promise<void>;
  getDueMessages(now: Date, batchSize: number): Promise<OutboundMessageWithId[]>;
  markSent(id: string): Promise<void>;
  markFailed(id: string, reason: string): Promise<void>;
}

export interface OutboundCampaignRepository {
  getActive(): Promise<OutboundCampaign[]>;
  getTopAgencyRecipients(limit: number, tenantId?: string): Promise<OutboundRecipient[]>;
}

export interface OutboundContentBuilder {
  buildMessage(
    recipient: OutboundRecipient,
    campaign: OutboundCampaign,
  ): Promise<{ subject: string; body: string }>;
}
