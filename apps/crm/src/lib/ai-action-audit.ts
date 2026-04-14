import { createHash } from "crypto";

import { createServiceRoleClient } from "@/lib/supabase/admin";

export type AiAuditKind =
  | "ai_suggested"
  | "human_approved"
  | "sent"
  | "send_failed"
  | "frequency_blocked";

export function hashBodyPreview(body: string): string {
  return createHash("sha256").update(body, "utf8").digest("hex").slice(0, 32);
}

export async function logAiActionAudit(input: {
  agencyId: string | null;
  leadId: string | null;
  profileId?: string | null;
  actionKind: AiAuditKind;
  channel: "email" | "sms";
  variant?: string | null;
  subjectPreview?: string | null;
  bodyText?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return;
  }

  const body_hash = input.bodyText ? hashBodyPreview(input.bodyText) : null;

  const { error } = await supabase.from("ai_action_audit").insert({
    agency_id: input.agencyId,
    lead_id: input.leadId,
    profile_id: input.profileId ?? null,
    action_kind: input.actionKind,
    channel: input.channel,
    variant: input.variant ?? null,
    subject_preview: input.subjectPreview?.slice(0, 500) ?? null,
    body_hash,
    meta: input.meta ?? {},
  });

  if (error) {
    console.warn("[ai-action-audit] insert:", error.message);
  }
}
