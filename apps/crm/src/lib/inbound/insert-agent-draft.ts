// Shared writer for AI drafts that a broker approves and sends
// (approve-draft.ts). Stores the exact text + recipient so the approve path
// sends verbatim, and audits the draft as ai_suggested / pending_human.
import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logAiAction } from '@/lib/ai-action-audit'

export interface AgentDraftInput {
  admin:         SupabaseClient
  leadId:        string
  agencyId:      string | null
  profileId?:    string | null
  agentId:       string
  promptVersion: string
  channel:       string
  subject:       string
  body:          string
  /** Omitted when the lead has no address for the channel — then the draft is manual-only. */
  recipient?:    string | null
  activity: {
    type:      string
    title:     string
    actorName: string
    source:    string
    /** Lines appended under the body (reason, channel, …). */
    notes?:    string[]
  }
  extraMeta?:   Record<string, unknown>
  auditAction:  string
  /** Cost/model fields for the ai_suggested audit row, when the caller has them. */
  auditExtras?: {
    costEur?:      number | null
    creditsSpent?: number | null
    model?:        string | null
    variant?:      string | null
  }
}

/**
 * `correlationId` ties the whole chain together — ai_suggested → human_approved
 * → sent/send_failed all carry it in ai_action_audit.meta (Blueprint §11).
 */
export async function insertAgentDraft(
  d: AgentDraftInput,
): Promise<{ ok: true; correlationId: string; activityId: string } | { ok: false; error: string }> {
  const correlationId = randomUUID()
  // Chosen here so the caller can point the broker at this exact draft.
  const activityId = randomUUID()
  const text = [
    d.body,
    '',
    ...(d.activity.notes ?? []),
    'Neodoslané — vyžaduje schválenie makléra.',
  ].join('\n')

  const { error } = await d.admin.from('activities').insert({
    id:          activityId,
    lead_id:     d.leadId,
    type:        d.activity.type,
    title:       d.activity.title,
    text,
    entity_type: 'lead',
    entity_id:   d.leadId,
    actor_name:  d.activity.actorName,
    source:      d.activity.source,
    severity:    'info',
    meta: {
      ...d.extraMeta,
      draft:             true,
      requires_approval: true,
      agent_id:          d.agentId,
      prompt_version:    d.promptVersion,
      correlation_id:    correlationId,
      channel:           d.channel,
      // Exactly what the broker approves is exactly what gets sent.
      subject:           d.subject,
      body:              d.body,
      ...(d.recipient ? { recipient: d.recipient } : {}),
    },
  })
  if (error) return { ok: false, error: error.message }

  await logAiAction({
    action:         d.auditAction,
    agencyId:       d.agencyId,
    leadId:         d.leadId,
    profileId:      d.profileId ?? null,
    actionKind:     'ai_suggested',
    channel:        d.channel === 'sms' ? 'sms' : 'email',
    subjectPreview: d.subject,
    bodyText:       d.body,
    ...d.auditExtras,
    meta: {
      agent_id:        d.agentId,
      prompt_version:  d.promptVersion,
      correlation_id:  correlationId,
      approval_state:  'pending_human',
      planned_channel: d.channel,
    },
  }).catch((e) => console.error(`[insertAgentDraft] audit ${d.agentId}:`, e))

  return { ok: true, correlationId, activityId }
}

/** The address a draft on `channel` would be sent to, from the lead's contact fields. */
export function recipientFor(
  channel: string,
  lead: { email?: string | null; phone?: string | null },
): string | null {
  const addr = channel === 'email' ? lead.email : lead.phone
  return addr?.trim() || null
}
