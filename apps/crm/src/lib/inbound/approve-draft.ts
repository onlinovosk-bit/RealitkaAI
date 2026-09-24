// ================================================================
// Revolis.AI — Approve & send an inbound AI reply draft (Tier 3)
//
// The only path by which REVOLIS-INBOUND-AUTOREPLY text reaches a lead.
// Invariants:
//   - sends exactly meta.subject / meta.body to meta.recipient — the text the
//     broker saw, never a regenerated one;
//   - only a broker of the lead's own agency can approve;
//   - a draft is sent at most once: the row is claimed (approval_state =
//     'sending') by a conditional update before any send, so a double click
//     or a second tab gets 409, not a second e-mail;
//   - human_approved is audited before the send, sent / send_failed after.
// ================================================================
import type { SupabaseClient } from '@supabase/supabase-js'
import { logAiAction } from '@/lib/ai-action-audit'
import { sendMessage, type SendMessageResult } from '@/lib/multi-channel-sender'
import { AUTO_REPLY_PROMPT_VERSION } from './auto-reply'
import { INBOUND_AUTOREPLY_AGENT_ID } from './draft-view'

export type ApprovalState = 'sending' | 'sent' | 'send_failed'

export interface ApproveDraftInput {
  admin:      SupabaseClient
  leadId:     string
  activityId: string
  approver:   { profileId: string; agencyId: string | null; label: string }
  /** Injected for tests; defaults to the shared multi-channel sender. */
  send?:      typeof sendMessage
  now?:       () => Date
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
    meta.agent_id !== INBOUND_AUTOREPLY_AGENT_ID ||
    meta.draft !== true ||
    meta.requires_approval !== true
  ) {
    return fail(422, 'Táto aktivita nie je návrh na schválenie.')
  }
  if (!meta.subject || !meta.body || !meta.recipient) {
    // Drafts created before the body was stored cannot be sent verbatim.
    return fail(422, 'Návrh nemá uložený text na odoslanie. Pošlite odpoveď ručne.')
  }
  if (meta.approval_state === 'sent')    return fail(409, 'Návrh už bol odoslaný.')
  if (meta.approval_state === 'sending') return fail(409, 'Návrh sa práve odosiela.')

  // Claim: only one caller can move the row out of {pending, send_failed}.
  const approvedAt = now().toISOString()
  const claimedMeta: DraftMeta = {
    ...meta,
    approval_state: 'sending',
    approved_by:    approver.label,
    approved_by_profile_id: approver.profileId,
    approved_at:    approvedAt,
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
    action:         'inbound_autoreply_approve',
    agencyId:       approver.agencyId,
    leadId,
    profileId:      approver.profileId,
    channel:        'email' as const,
    subjectPreview: meta.subject,
    bodyText:       meta.body,
  }
  const auditMeta = {
    agent_id:       INBOUND_AUTOREPLY_AGENT_ID,
    prompt_version: (meta.prompt_version as string | undefined) ?? AUTO_REPLY_PROMPT_VERSION,
    activity_id:    activityId,
    approved_by:    approver.label,
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
      channel:     'email',
      subject:     meta.subject,
      body:        meta.body,
      aiGenerated: true,
      meta:        { activity_id: activityId, agent_id: INBOUND_AUTOREPLY_AGENT_ID },
    })
  } catch (e) {
    result = {
      ok: false, channel: 'email', to: meta.recipient,
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
