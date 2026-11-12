// ================================================================
// Revolis.AI — Inbound Auto-Reply Generator
// Generates personalised first-touch reply via Claude Haiku
// ================================================================
import { callClaude, CLAUDE_HAIKU, extractJson } from '@/lib/ai/claude'
import { cachedSystem } from '@/lib/ai/prompt-cache'
import { withAiTimeout } from '@/lib/ai/fallback'
import type { AiFailure } from '@/lib/ai/ai-failure'
import { estimateClaudeCostEur } from '@/lib/ai/llm-usage-cost'
import { AGENT_PLACEHOLDER, NAME_PLACEHOLDER, restoreName } from '@/lib/privacy/minimize'

/**
 * Bump whenever SYSTEM or the user template below changes. Stamped on every
 * draft and its `ai_action_audit` row so a draft can be traced to its prompt
 * (Agentic System Blueprint §11).
 */
export const AUTO_REPLY_PROMPT_VERSION = 'inbound-autoreply-v2'

export interface AutoReplyInput {
  leadName:     string
  source:       string
  message?:     string
  propertyType?: string
  location?:    string
  budget?:      string
  agentName?:   string
}

export type AutoReplyAudit = {
  source: 'llm' | 'fallback'
  model: string | null
  costEur: number | null
  latencyMs: number
}

export interface AutoReplyResult {
  subject: string
  body:    string
  /** True when the LLM timed out or failed and this is the fixed fallback text. */
  fallback?: boolean
  /** Prečo LLM zlyhal (kód dôvodu, HTTP status, request-id — nikdy text chyby). Len pri `fallback`. */
  failure?: AiFailure
  audit: AutoReplyAudit
}

/** Default LLM budget. Callers off the hot path may allow more. */
export const AUTO_REPLY_TIMEOUT_MS = 500

const SYSTEM = `Si AI asistent pre realitného makléra na Slovensku. \
Napíš personalizovanú odpoveď novému leadovi. \
Buď ľudský, profesionálny, stručný — max 4 vety. \
Výstup je VŽDY validný JSON bez markdown.`

export async function generateAutoReply(
  data: AutoReplyInput,
  opts: { timeoutMs?: number } = {},
): Promise<AutoReplyResult> {
  const startedAt = Date.now()
  const fallback: AutoReplyResult = {
    fallback: true,
    subject: `Ďakujeme za váš záujem, ${data.leadName}`,
    body:    `Dobrý deň ${data.leadName},\n\nďakujeme za váš záujem. Náš maklér vás bude kontaktovať čo najskôr.\n\nS pozdravom\n${data.agentName ?? 'Revolis.AI tím'}`,
    audit: {
      source: 'fallback',
      model: null,
      costEur: null,
      latencyMs: 0,
    },
  }

  const aiCall = callClaude({
    model:      CLAUDE_HAIKU,
    max_tokens: 300,
    system: cachedSystem(SYSTEM, CLAUDE_HAIKU),
    messages: [{
      role:    'user',
      content: `Nový lead:
- Meno: ${NAME_PLACEHOLDER}
- Záujem: ${data.propertyType ?? 'nehnuteľnosť'} v ${data.location ?? 'neuvedená lokalita'}
- Rozpočet: ${data.budget ?? 'neuvedený'}
- Správa: ${data.message ?? '(žiadna)'}
- Zdroj: ${data.source}

Napíš odpoveď v mene makléra ${AGENT_PLACEHOLDER}.
Oslovenie klienta napíš presne ako ${NAME_PLACEHOLDER}, podpis presne ako ${AGENT_PLACEHOLDER} — doplníme ich my.
JSON: { "subject": "predmet emailu SK", "body": "text emailu SK, max 4 vety" }`,
    }],
  }, 'auto-reply').then(resp => {
    const raw = resp.content[0].type === 'text' ? resp.content[0].text : ''
    const parsed = extractJson<{ subject?: string; body?: string }>(raw)
    const agent = data.agentName ?? 'Revolis.AI tím'
    return {
      subject: restoreName(restoreName(parsed.subject ?? '', data.leadName), agent, AGENT_PLACEHOLDER),
      body:    restoreName(restoreName(parsed.body ?? '', data.leadName), agent, AGENT_PLACEHOLDER),
      audit: {
        source: 'llm' as const,
        model: CLAUDE_HAIKU,
        costEur: estimateClaudeCostEur(
          CLAUDE_HAIKU,
          resp.usage.input_tokens,
          resp.usage.output_tokens,
        ),
        latencyMs: Math.max(0, Date.now() - startedAt),
      },
    }
  })

  let failure: AiFailure | undefined
  const result = await withAiTimeout(aiCall, fallback, opts.timeoutMs ?? AUTO_REPLY_TIMEOUT_MS, {
    feature:   'inbound_auto_reply',
    onFailure: (f) => { failure = f },
  })

  if (result === fallback || (result as AutoReplyResult).fallback) {
    return {
      ...fallback,
      ...(failure ? { failure } : {}),
      audit: {
        source: 'fallback',
        model: null,
        costEur: null,
        latencyMs: Math.max(0, Date.now() - startedAt),
      },
    }
  }

  return {
    ...(result as Omit<AutoReplyResult, 'audit'>),
    audit: (result as { audit: AutoReplyAudit }).audit,
  }
}
