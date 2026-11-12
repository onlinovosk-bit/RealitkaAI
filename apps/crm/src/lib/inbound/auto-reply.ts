// ================================================================
// Revolis.AI — Inbound Auto-Reply Generator
// Generates personalised first-touch reply via Claude Haiku
// ================================================================
import { callClaude, CLAUDE_HAIKU, extractJson } from '@/lib/ai/claude'
import { estimateClaudeCostEur } from '@/lib/ai/llm-usage-cost'
import { withAiTimeout }                          from '@/lib/ai/fallback'

/**
 * Bump whenever SYSTEM or the user template below changes. Stamped on every
 * draft and its `ai_action_audit` row so a draft can be traced to its prompt
 * (Agentic System Blueprint §11).
 */
export const AUTO_REPLY_PROMPT_VERSION = 'inbound-autoreply-v1'

export interface AutoReplyInput {
  leadName:     string
  source:       string
  message?:     string
  propertyType?: string
  location?:    string
  budget?:      string
  agentName?:   string
}

export interface AutoReplyResult {
  subject: string
  body:    string
}

export type AutoReplyAudit = {
  source: 'llm' | 'fallback'
  model: string | null
  costEur: number | null
  latencyMs: number
}

export type GenerateAutoReplyResult = AutoReplyResult & {
  audit: AutoReplyAudit
}

const SYSTEM = `Si AI asistent pre realitného makléra na Slovensku. \
Napíš personalizovanú odpoveď novému leadovi. \
Buď ľudský, profesionálny, stručný — max 4 vety. \
Výstup je VŽDY validný JSON bez markdown.`

export async function generateAutoReply(data: AutoReplyInput): Promise<GenerateAutoReplyResult> {
  const startedAt = Date.now()
  const fallback: AutoReplyResult = {
    subject: `Ďakujeme za váš záujem, ${data.leadName}`,
    body:    `Dobrý deň ${data.leadName},\n\nďakujeme za váš záujem. Náš maklér vás bude kontaktovať čo najskôr.\n\nS pozdravom\n${data.agentName ?? 'Revolis.AI tím'}`,
  }

  const fallbackResult: GenerateAutoReplyResult = {
    ...fallback,
    audit: {
      source: 'fallback',
      model: null,
      costEur: null,
      latencyMs: Math.max(0, Date.now() - startedAt),
    },
  }

  const aiCall = callClaude({
    model:      CLAUDE_HAIKU,
    max_tokens: 300,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{
      role:    'user',
      content: `Nový lead:
- Meno: ${data.leadName}
- Záujem: ${data.propertyType ?? 'nehnuteľnosť'} v ${data.location ?? 'neuvedená lokalita'}
- Rozpočet: ${data.budget ?? 'neuvedený'}
- Správa: ${data.message ?? '(žiadna)'}
- Zdroj: ${data.source}

Napíš odpoveď v mene makléra ${data.agentName ?? 'Revolis.AI tímu'}.
JSON: { "subject": "predmet emailu SK", "body": "text emailu SK, max 4 vety" }`,
    }],
  }, 'auto-reply').then(resp => {
    const raw = resp.content[0].type === 'text' ? resp.content[0].text : ''
    const parsed = extractJson<AutoReplyResult>(raw)
    return {
      ...parsed,
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

  return withAiTimeout(aiCall, fallbackResult, 500)
}
