// ================================================================
// Revolis.AI — Approve & send an AI draft to a lead (Tier 3)
//
// The only path by which AI-drafted text (inbound auto-reply, follow-up sweep,
// dead-lead campaign) reaches a lead — see SEND_ACTIONS.
// Invariants:
//   - sends exactly meta.subject / meta.body to meta.recipient — the text the
//     broker saw, never a regenerated one;
//   - only a broker of the lead's own agency can approve;
//   - a draft is sent at most once: the row is claimed (approval_state =
//     'sending') by a conditional update before any send, so a double click
//     or a second tab gets 409, not a second e-mail;
//   - the send is authorized by the Control Contract (resolveAuthority +
//     applyApproval); the kill switch (AGENT_KILL_SWITCH) blocks it even
//     after approval;
//   - human_approved is audited before the send, sent / send_failed after.
// ================================================================
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SystemState } from '@revolis/control-contract'
import { logAiAction } from '@/lib/ai-action-audit'
import { authorizeSend, authorityMeta } from '@/lib/control-plane/authorize-send'
import { sendMessage, type SendMessageResult } from '@/lib/multi-channel-sender'
import { AUTO_REPLY_PROMPT_VERSION } from './auto-reply'
import { DEAD_LEAD_AGENT_ID, FOLLOWUP_SWEEP_AGENT_ID, INBOUND_AUTOREPLY_AGENT_ID } from './draft-view'

export type ApprovalState = 'sending' | 'sent' | 'send_failed'

export interface ApproveDraftInput {
  admin:      SupabaseClient
  leadId:     string
  activityId: string
  approver:   { profileId: string; agencyId: string | null; label: string }
  /** Injected for tests; defaults to the shared multi-channel sender. */
  send?:      typeof sendMessage
  now?:       () => Date
  /** Injected for tests; defaults to the platform kill switch (AGENT_KILL_SWITCH). */
  systemState?: SystemState
}

/** Registered in packages/control-contract/src/actions.ts (irreversible, externally visible). */
export const INBOUND_SEND_ACTION = 'inbound.reply.email.send'

/**
 * Which registry action a draft's send is. Agent + channel -> action; anything
 * not listed is not approvable here (422). The registry, not this map, decides
 * how risky the action is.
 */
const SEND_ACTIONS: Readonly<Record<string, Partial<Record<'email' | 'sms', string>>>> = {
  [INBOUND_AUTOREPLY_AGENT_ID]: { email: INBOUND_SEND_ACTION },
  [FOLLOWUP_SWEEP_AGENT_ID]:    { email: 'followup.email.send', sms: 'followup.sms.send' },
  [DEAD_LEAD_AGENT_ID]:         { email: 'deadlead.email.send', sms: 'deadlead.sms.send' },
}

export function sendActionFor(agentId: unknown, channel: unknown): string | null {
  if (typeof agentId !== 'string' || (channel !== 'email' && channel !== 'sms')) return null
  return SEND_ACTIONS[agentId]?.[channel] ?? null
}

export type ApproveDraftResult =
  | { ok: true; messageId: string | null }
  | { ok: false; status: number; error: string }

type DraftMeta = Record<string, unknown> & {
  draft?: boolean
  requires_approval?: boolean
  agent_id?: string
  subject?: string
  body?: string
  recipient?: string
  approval_state?: ApprovalState
}

function fail(status: number, error: string): ApproveDraftResult {
  return { ok: false, status, error }
}

export async function approveAndSendInboundDraft(
  input: ApproveDraftInput
): Promise<ApproveDraftResult> {
  const { admin, leadId, activityId, approver } = input
  const send = input.send ?? sendMessage
  const now  = input.now ?? (() => new Date())

  if (!approver.agencyId) return fail(403, 'Profil nemá priradenú kanceláriu.')

  const { data: activity, error: actErr } = await admin
    .from('activities')
    .select('id, lead_id, meta')
    .eq('id', activityId)
    .maybeSingle()
  if (actErr) return fail(500, 'Návrh sa nepodarilo načítať.')
  // Unknown id and "belongs to another lead" look the same from outside.
  if (!activity || activity.lead_id !== leadId) return fail(404, 'Návrh sa nenašiel.')

  const { data: lead, error: leadErr } = await admin
    .from('leads')
    .select('id, agency_id')
    .eq('id', leadId)
    .maybeSingle()
  if (leadErr) return fail(500, 'Lead sa nepodarilo načítať.')
  if (!lead || lead.agency_id !== approver.agencyId) return fail(404, 'Návrh sa nenašiel.')

  const meta = (activity.meta ?? {}) as DraftMeta
  if (
    typeof meta.agent_id !== 'string' ||
    !(meta.agent_id in SEND_ACTIONS) ||
    meta.draft !== true ||
    meta.requires_approval !== true
  ) {
    return fail(422, 'Táto aktivita nie je návrh na schválenie.')
  }
  if (!meta.subject || !meta.body || !meta.recipient) {
    // Drafts created before the body was stored cannot be sent verbatim.
    return fail(422, 'Návrh nemá uložený text na odoslanie. Pošlite odpoveď ručne.')
  }
  // Legacy inbound drafts have no channel field; they were always e-mail.
  const rawChannel = typeof meta.channel === 'string' ? meta.channel : 'email'
  const action = sendActionFor(meta.agent_id, rawChannel)
  if (!action || (rawChannel !== 'email' && rawChannel !== 'sms')) {
    return fail(422, `Kanál „${rawChannel}" sa nedá odoslať odtiaľto. Pošlite správu ručne.`)
  }
  const channel: 'email' | 'sms' = rawChannel
  const agentId = meta.agent_id as string
  if (meta.approval_state === 'sent')    return fail(409, 'Návrh už bol odoslaný.')
  if (meta.approval_state === 'sending') return fail(409, 'Návrh sa práve odosiela.')

  // Authority (Control Contract): the send is irreversible + externally visible,
  // so it floors at APPROVAL_REQUIRED; this click is the approval. The kill
  // switch makes it FORBIDDEN, and no approval overrides that (I-007).
  const approvedAt = now().toISOString()
  const authz = authorizeSend({
    action,
    agentId,
    tenantId: approver.agencyId,
    approval: { approvalId: activityId, approvedBy: approver.label, approvedAt },
    systemState: input.systemState,
    now,
  })
  if (!authz.ok) return fail(authz.status, authz.reason)
  const authorityFields = authorityMeta(authz.verdict)

  // Claim: only one caller can move the row out of {pending, send_failed}.
  const claimedMeta: DraftMeta = {
    ...meta,
    approval_state: 'sending',
    approved_by:    approver.label,
    approved_by_profile_id: approver.profileId,
    approved_at:    approvedAt,
    ...authorityFields,
  }
  const { data: claimed, error: claimErr } = await admin
    .from('activities')
    .update({ meta: claimedMeta })
    .eq('id', activityId)
    .or('meta->>approval_state.is.null,meta->>approval_state.eq.send_failed')
    .select('id')
  if (claimErr) return fail(500, 'Návrh sa nepodarilo zamknúť.')
  if (!claimed || claimed.length === 0) return fail(409, 'Návrh už spracúva niekto iný.')

  const auditBase = {
    action:         `${agentId}:approve`,
    agencyId:       approver.agencyId,
    leadId,
    profileId:      approver.profileId,
    channel,
    subjectPreview: meta.subject,
    bodyText:       meta.body,
  }
  const auditMeta = {
    agent_id:       agentId,
    prompt_version:
      (meta.prompt_version as string | undefined) ??
      (agentId === INBOUND_AUTOREPLY_AGENT_ID ? AUTO_REPLY_PROMPT_VERSION : null),
    activity_id:    activityId,
    approved_by:    approver.label,
    action,
    ...authorityFields,
  }

  await logAiAction({
    ...auditBase,
    actionKind: 'human_approved',
    meta:       { ...auditMeta, approval_state: 'approved' },
  }).catch(e => console.error('[approveInboundDraft] audit human_approved:', e))

  let result: SendMessageResult
  try {
    result = await send({
      leadId,
      to:          meta.recipient,
      channel,
      subject:     meta.subject,
      body:        meta.body,
      aiGenerated: true,
      meta:        { activity_id: activityId, agent_id: agentId },
    })
  } catch (e) {
    result = {
      ok: false, channel, to: meta.recipient,
      error: e instanceof Error ? e.message : 'send failed',
    }
  }

  const finalMeta: DraftMeta = result.ok
    ? { ...claimedMeta, approval_state: 'sent', sent_at: now().toISOString(), message_id: result.messageId ?? null }
    : { ...claimedMeta, approval_state: 'send_failed', last_error: result.error ?? 'send failed' }

  const { error: finalErr } = await admin
    .from('activities')
    .update({ meta: finalMeta })
    .eq('id', activityId)
  if (finalErr) {
    // The e-mail state is what matters; a stale 'sending' blocks re-sends,
    // which is the safe direction. Surface it in logs.
    console.error('[approveInboundDraft] final state write failed:', finalErr.message)
  }

  await logAiAction({
    ...auditBase,
    actionKind: result.ok ? 'sent' : 'send_failed',
    meta: {
      ...auditMeta,
      approval_state: finalMeta.approval_state,
      ...(result.ok ? { message_id: result.messageId ?? null } : { error: result.error }),
    },
  }).catch(e => console.error('[approveInboundDraft] audit result:', e))

  if (!result.ok) return fail(502, `Odoslanie zlyhalo: ${result.error ?? 'neznáma chyba'}`)
  return { ok: true, messageId: result.messageId ?? null }
}
