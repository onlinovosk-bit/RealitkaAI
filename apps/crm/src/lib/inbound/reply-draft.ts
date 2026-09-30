// ================================================================
// Revolis.AI — AI reply draft for a new inbound lead
//
// Shared by every inbound path (webhook, e-mail gateway, web form). Writes a
// draft the broker approves via approve-draft.ts ("Schváliť a odoslať");
// nothing here sends. Tier 3: the text reaches the lead only after a human.
// ================================================================
import type { SupabaseClient } from '@supabase/supabase-js'
import { after } from 'next/server'
import { classifyAiError, type AiFailure } from '@/lib/ai/ai-failure'
import { recordAiFailureEvent } from '@/lib/ai/ai-failure-record'
import { AUTO_REPLY_PROMPT_VERSION, generateAutoReply } from './auto-reply'
import { INBOUND_AUTOREPLY_AGENT_ID } from './draft-view'
import { insertAgentDraft, recipientFor } from './insert-agent-draft'

export interface InboundReplyDraftInput {
  admin:     SupabaseClient
  leadId:    string
  agencyId:  string
  profileId?: string | null
  agentName?: string | null
  lead: {
    name:          string
    email?:        string | null
    message?:      string
    source?:       string
    propertyType?: string
    location?:     string
    budget?:       string
  }
  /** `activities.source` — which inbound path produced the draft. */
  activitySource: string
  timeoutMs?:     number
  /**
   * Skip the draft when the LLM fell back to the fixed text. On paths where the
   * office already sends a templated acknowledgement, a fallback draft would
   * only repeat it.
   */
  skipOnFallback?: boolean
}

export type InboundReplyDraftResult =
  | { created: true; activityId: string }
  | {
      created: false
      reason: 'disabled' | 'no_email' | 'llm_fallback' | 'insert_failed' | 'error'
      /** Prečo krok zlyhal (kód dôvodu, HTTP status, request-id — nikdy text chyby). */
      failure?: AiFailure
    }

/**
 * LLM budget on the live ingest paths. Off the user's critical path (the lead
 * is already stored), so it can wait for a real reply instead of the fallback.
 */
export const INBOUND_REPLY_DRAFT_TIMEOUT_MS = 8_000

/** Kill switch for the draft LLM call on live ingest paths (env var; takes effect on the next deploy). */
export function inboundReplyDraftsDisabled(): boolean {
  return process.env.INBOUND_REPLY_DRAFT_DISABLED === '1'
}

export async function draftInboundReply(d: InboundReplyDraftInput): Promise<InboundReplyDraftResult> {
  const recipient = recipientFor('email', d.lead)
  if (!recipient) return { created: false, reason: 'no_email' }

  // Input is untrusted (the lead's own message), so the text must pass a
  // human before it reaches anyone.
  const reply = await generateAutoReply({
    leadName:     d.lead.name,
    source:       d.lead.source ?? 'web',
    message:      d.lead.message,
    propertyType: d.lead.propertyType,
    location:     d.lead.location,
    budget:       d.lead.budget,
    agentName:    d.agentName ?? undefined,
  }, { timeoutMs: d.timeoutMs })

  if (reply.fallback && d.skipOnFallback) {
    return { created: false, reason: 'llm_fallback', ...(reply.failure ? { failure: reply.failure } : {}) }
  }

  const draft = await insertAgentDraft({
    admin:         d.admin,
    leadId:        d.leadId,
    agencyId:      d.agencyId,
    profileId:     d.profileId ?? null,
    agentId:       INBOUND_AUTOREPLY_AGENT_ID,
    promptVersion: AUTO_REPLY_PROMPT_VERSION,
    channel:       'email',
    subject:       reply.subject,
    body:          reply.body,
    recipient,
    activity: {
      type:      'AI návrh odpovede',
      title:     `Návrh odpovede (AI) — ${reply.subject}`,
      actorName: 'AI inbound auto-reply',
      source:    d.activitySource,
      notes:     ['Kanál: email', `Príjemca: ${recipient}`],
    },
    auditAction: 'ai_email',
  })
  if (!draft.ok) {
    console.error(`[draftInboundReply] ${d.activitySource} draft insert failed:`, draft.error)
    return { created: false, reason: 'insert_failed' }
  }
  return { created: true, activityId: draft.activityId }
}

/**
 * Inbound paths call this after the lead is stored. It never throws: a lost
 * draft is recoverable (the broker replies by hand), a lost lead is not.
 */
export async function draftInboundReplySafely(d: InboundReplyDraftInput): Promise<InboundReplyDraftResult> {
  if (inboundReplyDraftsDisabled()) return { created: false, reason: 'disabled' }
  try {
    return await draftInboundReply(d)
  } catch (e) {
    console.error(`[draftInboundReply] ${d.activitySource}:`, e)
    return { created: false, reason: 'error', failure: classifyAiError(e) }
  }
}

/**
 * Runs the draft after the HTTP response, so neither the e-mail Worker nor the
 * web form waits on the LLM. Outside a request scope (scripts, tests) it
 * still runs, best effort.
 */
export function scheduleInboundReplyDraft(d: InboundReplyDraftInput): void {
  const task = async () => {
    const res = await draftInboundReplySafely(d)
    const failure = res.created ? undefined : res.failure
    const line = JSON.stringify({
      status: 'INBOUND_REPLY_DRAFT',
      source: d.activitySource,
      lead_id: d.leadId,
      result: res.created ? 'created' : res.reason,
      // Prečo LLM zlyhal — bez toho `llm_fallback` nerozlíši kredit, kľúč a timeout.
      ...(failure ? { llm_reason: failure.reason, llm_http_status: failure.httpStatus } : {}),
    })
    // Nevytvorený návrh je `warn`, nie `log`. Vercel na tomto pláne drží len
    // `warn`/`error` a zoskupuje riadky podľa requestu, takže úspešný request
    // bez varovania je v logoch neviditeľný celý. Presne to sa stalo leadu
    // z 2026-09-29 07:37: lead v DB je, návrh nie, a dôvod sa už nedal zistiť.
    // Vedľajší efekt: `warn` zviditeľní aj `LEAD_CREATED` z toho istého requestu.
    if (res.created) console.log(line)
    else console.warn(line)
    // Log žije ~1 h; dôvod zlyhania sa musí dať prečítať aj neskôr.
    if (failure) {
      try {
        await recordAiFailureEvent({
          agencyId: d.agencyId,
          leadId: d.leadId,
          feature: 'inbound_reply_draft',
          failure,
        })
      } catch {
        // Best-effort: kontrakt „nikdy nehádže" nemá závisieť od implementácie zapisovača.
      }
    }
  }
  try {
    after(task)
  } catch {
    void task()
  }
}
