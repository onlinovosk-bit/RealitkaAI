// ================================================================
// Revolis.AI — Inbound Lead Processor
// insert → BRI → logEvent → AI reply DRAFT (never sent from here)
//
// Tier 3 (Agentic System Blueprint §8, Revolis System Spec §13): a message
// to a person outside the tenant needs human approval. This processor only
// stores the AI text as a draft activity + `ai_suggested` audit row. The
// broker sends it — nothing in this module talks to Resend or WhatsApp.
// ================================================================
import { computeBRI }        from '@/lib/bri/engine'
import { logEvent }          from '@/lib/events/log-event'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { AUTO_REPLY_PROMPT_VERSION, generateAutoReply } from './auto-reply'
import { insertAgentDraft } from './insert-agent-draft'

import { INBOUND_AUTOREPLY_AGENT_ID } from './draft-view'

export { INBOUND_AUTOREPLY_AGENT_ID }
const BRI_REPLY_THRESHOLD = 40   // minimum score to draft a reply

export interface InboundLeadPayload {
  name:          string
  email?:        string
  phone?:        string
  source?:       string
  message?:      string
  propertyType?: string
  location?:     string
  budget?:       string
  profileId:     string
}

export interface ProcessLeadResult {
  leadId:       string
  briScore:     number
  draftCreated: boolean
  /** Always false: sending is a human action (Tier 3). Kept for API compatibility. */
  replySent:    false
}

/** Caller-facing failure with an HTTP status; message is safe to return. */
export class InboundLeadError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'InboundLeadError'
  }
}

export async function processInboundLead(
  payload: InboundLeadPayload
): Promise<ProcessLeadResult> {
  const admin = createServiceRoleClient()
  if (!admin) {
    throw new InboundLeadError('Služba nie je dostupná.', 503)
  }

  // 1. Resolve the owning profile first — the lead must land in its agency.
  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('id, full_name, agency_id')
    .eq('id', payload.profileId)
    .maybeSingle()

  if (profileErr) {
    throw new Error(`profile lookup failed: ${profileErr.message}`)
  }
  if (!profile || !profile.agency_id) {
    throw new InboundLeadError('Neznámy profileId.', 422)
  }
  const agencyId = profile.agency_id as string

  // 2. Insert lead — a failed insert fails the request (AP-010).
  const leadId = crypto.randomUUID()
  const { error: insertErr } = await admin.from('leads').insert({
    id:              leadId,
    agency_id:       agencyId,
    name:            payload.name,
    email:           payload.email ?? '',
    phone:           payload.phone ?? '',
    source:          payload.source ?? 'Inbound',
    note:            payload.message ?? '',
    location:        payload.location ?? '',
    budget:          payload.budget ?? '',
    property_type:   payload.propertyType ?? 'Byt',
    status:          'Nový',
    score:           50,
    assigned_agent:  'Nepriradený',
    last_contact:    'Práve importovaný',
  })
  if (insertErr) {
    throw new Error(`lead insert failed: ${insertErr.message}`)
  }

  // 3. Compute BRI
  const bri      = await computeBRI(leadId, payload.profileId, 'lead_created')
  const briScore = bri?.new_score ?? 50

  // 4. Audit event
  await logEvent({
    profileId:  payload.profileId,
    entityType: 'lead',
    entityId:   leadId,
    eventType:  'lead_created',
    payload: {
      source:    payload.source,
      bri_score: briScore,
      has_email: !!payload.email,
      has_phone: !!payload.phone,
    },
  })

  if (briScore < BRI_REPLY_THRESHOLD || !payload.email) {
    return { leadId, briScore, draftCreated: false, replySent: false }
  }

  // 5. AI reply → draft only. Input is untrusted (payload.message), so the
  //    text must pass a human before it reaches anyone.
  const reply = await generateAutoReply({
    leadName:     payload.name,
    source:       payload.source ?? 'web',
    message:      payload.message,
    propertyType: payload.propertyType,
    location:     payload.location,
    budget:       payload.budget,
    agentName:    profile.full_name ?? undefined,
  })

  const draft = await insertAgentDraft({
    admin,
    leadId,
    agencyId,
    profileId:     payload.profileId,
    agentId:       INBOUND_AUTOREPLY_AGENT_ID,
    promptVersion: AUTO_REPLY_PROMPT_VERSION,
    channel:       'email',
    subject:       reply.subject,
    body:          reply.body,
    recipient:     payload.email,
    activity: {
      type:      'AI návrh odpovede',
      title:     `Návrh odpovede (AI) — ${reply.subject}`,
      actorName: 'AI inbound auto-reply',
      source:    'webhook_inbound_lead',
      notes:     ['Kanál: email', `Príjemca: ${payload.email}`],
    },
    auditAction: 'ai_email',
  })
  if (!draft.ok) {
    // The lead exists; losing the draft is recoverable, so report, don't fail.
    console.error('[processInboundLead] draft insert failed:', draft.error)
    return { leadId, briScore, draftCreated: false, replySent: false }
  }

  return { leadId, briScore, draftCreated: true, replySent: false }
}
