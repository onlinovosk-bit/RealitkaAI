// src/infra/db/SupabaseOutboundRepositories.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  OutboundCampaign,
  OutboundCampaignRepository,
  OutboundMessagePlan,
  OutboundMessageRepository,
  OutboundMessageWithId,
  OutboundRecipient,
} from "@/domain/outbound/OutboundCampaign";

// ─── Campaign Repository ──────────────────────────────────────────────────────

class SupabaseOutboundCampaignRepository implements OutboundCampaignRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getActive(): Promise<OutboundCampaign[]> {
    const { data, error } = await this.supabase
      .from("outbound_campaigns")
      .select("id, name, channel, status, tenant_id, project_id")
      .eq("status", "active");

    if (error) throw new Error(`getActive failed: ${error.message}`);

    return (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      channel: row.channel as OutboundCampaign["channel"],
      status: row.status as OutboundCampaign["status"],
      tenantId: row.tenant_id as string,
      projectId: row.project_id as string,
    }));
  }

  async getTopAgencyRecipients(
    limit: number,
    tenantId?: string,
  ): Promise<OutboundRecipient[]> {
    let query = this.supabase
      .from("agencies")
      .select("id, name, email")
      .not("email", "is", null)
      .order("opportunity_score", { ascending: false })
      .limit(limit);

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data, error } = await query;

    if (error) throw new Error(`getTopAgencyRecipients failed: ${error.message}`);

    return (data ?? [])
      .filter((row) => row.email)
      .map((row) => ({
        agencyId: row.id as string,
        email: row.email as string,
        name: row.name as string,
      }));
  }
}

// ─── Message Repository ───────────────────────────────────────────────────────

class SupabaseOutboundMessageRepository implements OutboundMessageRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async scheduleBatch(messages: OutboundMessagePlan[]): Promise<void> {
    if (!messages.length) return;

    const rows = messages.map((m) => ({
      campaign_id: m.campaignId,
      agency_id: m.agencyId,
      recipient_email: m.recipientEmail,
      recipient_name: m.recipientName,
      subject: m.subject,
      body: m.body,
      send_at: m.sendAt.toISOString(),
      status: "pending",
    }));

    const { error } = await this.supabase.from("outbound_messages").insert(rows);

    if (error) throw new Error(`scheduleBatch failed: ${error.message}`);
  }

  async getDueMessages(now: Date, batchSize: number): Promise<OutboundMessageWithId[]> {
    const { data, error } = await this.supabase
      .from("outbound_messages")
      .select(
        "id, campaign_id, agency_id, recipient_email, recipient_name, subject, body, send_at",
      )
      .eq("status", "pending")
      .lte("send_at", now.toISOString())
      .limit(batchSize);

    if (error) throw new Error(`getDueMessages failed: ${error.message}`);

    return (data ?? []).map((row) => ({
      id: row.id as string,
      campaignId: row.campaign_id as string,
      agencyId: row.agency_id as string,
      recipientEmail: row.recipient_email as string,
      recipientName: row.recipient_name as string,
      subject: row.subject as string,
      body: row.body as string,
      sendAt: new Date(row.send_at as string),
    }));
  }

  async markSent(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("outbound_messages")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw new Error(`markSent(${id}) failed: ${error.message}`);
  }

  async markFailed(id: string, reason: string): Promise<void> {
    const { error } = await this.supabase
      .from("outbound_messages")
      .update({ status: "failed", value_text: reason })
      .eq("id", id);

    if (error) throw new Error(`markFailed(${id}) failed: ${error.message}`);
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createSupabaseOutboundRepositories(supabase: SupabaseClient): {
  campaigns: OutboundCampaignRepository;
  messages: OutboundMessageRepository;
} {
  return {
    campaigns: new SupabaseOutboundCampaignRepository(supabase),
    messages: new SupabaseOutboundMessageRepository(supabase),
  };
}
