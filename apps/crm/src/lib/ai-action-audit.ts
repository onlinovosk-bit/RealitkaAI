import { createHash } from "crypto";

import { createServiceRoleClient } from "@/lib/supabase/admin";

export type AiAuditKind =
  | "ai_suggested"
  | "human_approved"
  | "sent"
  | "send_failed"
  | "frequency_blocked";

export type AiCreditAction =
  | "lead_unlock"
  | "lead_analysis"
  | "ai_email"
  | "listing_description"
  | "dashboard_insights"
  | "morning_brief"
  | "ghostwriter"
  | "call_coach"
  | "call_transcribe"
  | "rescore_insight"
  | "outreach_approve"
  | "outreach_send";

export function hashBodyPreview(body: string): string {
  return createHash("sha256").update(body, "utf8").digest("hex").slice(0, 32);
}

export type LogAiActionOptions = {
  /** When true, insert failure throws instead of console.warn (outreach cost path). */
  strict?: boolean;
};

export type LogAiActionResult =
  | { ok: true }
  | { ok: false; error: string; code?: string };

export async function logAiAction(
  input: {
    action: AiCreditAction | string;
    agencyId: string | null;
    leadId?: string | null;
    profileId?: string | null;
    channel?: "email" | "sms";
    creditsSpent?: number | null;
    costEur?: number | null;
    model?: string | null;
    latencyMs?: number | null;
    actionKind?: AiAuditKind;
    variant?: string | null;
    subjectPreview?: string | null;
    bodyText?: string | null;
    meta?: Record<string, unknown>;
  },
  options?: LogAiActionOptions,
): Promise<LogAiActionResult> {
  return logAiActionAudit({
    agencyId: input.agencyId,
    leadId: input.leadId ?? null,
    profileId: input.profileId,
    actionKind: input.actionKind ?? "ai_suggested",
    channel: input.channel ?? "email",
    variant: input.variant,
    subjectPreview: input.subjectPreview,
    bodyText: input.bodyText,
    costEur: input.costEur,
    creditsSpent: input.creditsSpent,
    model: input.model,
    latencyMs: input.latencyMs,
    meta: { feature: input.action, ...input.meta },
  }, options);
}

export async function logAiActionAudit(
  input: {
  agencyId: string | null;
  leadId: string | null;
  profileId?: string | null;
  actionKind: AiAuditKind;
  channel: "email" | "sms";
  variant?: string | null;
  subjectPreview?: string | null;
  bodyText?: string | null;
  costEur?: number | null;
  creditsSpent?: number | null;
  model?: string | null;
  latencyMs?: number | null;
  meta?: Record<string, unknown>;
  },
  options?: LogAiActionOptions,
): Promise<LogAiActionResult> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    const msg = "service_role_unavailable";
    if (options?.strict) {
      throw new Error(`[ai-action-audit] ${msg}`);
    }
    console.warn("[ai-action-audit] insert:", msg);
    return { ok: false, error: msg, code: msg };
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
    cost_eur: input.costEur ?? null,
    credits_spent: input.creditsSpent ?? null,
    model: input.model ?? null,
    latency_ms: input.latencyMs ?? null,
    meta: input.meta ?? {},
  });

  if (error) {
    if (options?.strict) {
      throw new Error(`[ai-action-audit] insert failed: ${error.message}`);
    }
    console.warn("[ai-action-audit] insert:", error.message);
    return { ok: false, error: error.message, code: error.code };
  }

  return { ok: true };
}
