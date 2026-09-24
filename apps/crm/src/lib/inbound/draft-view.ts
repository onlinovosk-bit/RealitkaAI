// Client-safe view of an inbound AI reply draft (no server imports here —
// the lead detail page renders it).

export const INBOUND_AUTOREPLY_AGENT_ID = 'REVOLIS-INBOUND-AUTOREPLY'

export type InboundDraftState = 'pending' | 'sending' | 'sent' | 'send_failed'

export interface InboundDraftView {
  recipient: string
  subject:   string
  state:     InboundDraftState
  /** Present only when a draft can be approved (pending or a failed send). */
  canApprove: boolean
  lastError?: string
}

/** Returns the draft view for an activity's meta, or null if it is not an approvable inbound draft. */
export function toInboundDraftView(meta: unknown): InboundDraftView | null {
  if (!meta || typeof meta !== 'object') return null
  const m = meta as Record<string, unknown>
  if (m.agent_id !== INBOUND_AUTOREPLY_AGENT_ID || m.draft !== true || m.requires_approval !== true) {
    return null
  }
  const raw = m.approval_state
  const state: InboundDraftState =
    raw === 'sending' || raw === 'sent' || raw === 'send_failed' ? raw : 'pending'
  const sendable = typeof m.body === 'string' && typeof m.recipient === 'string' && typeof m.subject === 'string'
  return {
    recipient:  typeof m.recipient === 'string' ? m.recipient : '',
    subject:    typeof m.subject === 'string' ? m.subject : '',
    state,
    canApprove: sendable && (state === 'pending' || state === 'send_failed'),
    ...(typeof m.last_error === 'string' ? { lastError: m.last_error } : {}),
  }
}
