// ================================================================
// Revolis.AI — Inbound Auto-Reply Generator
// Generates personalised first-touch reply via Claude Haiku
// ================================================================
import { callClaude, CLAUDE_HAIKU, extractJson } from '@/lib/ai/claude'
import { withAiTimeout }                          from '@/lib/ai/fallback'

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

const SYSTEM = `Si AI asistent pre realitného makléra na Slovensku. \
Napíš personalizovanú odpoveď novému leadovi. \
Buď ľudský, profesionálny, stručný — max 4 vety. \
Výstup je VŽDY validný JSON bez markdown.`

export async function generateAutoReply(data: AutoReplyInput): Promise<AutoReplyResult> {
  const fallback: AutoReplyResult = {
    subject: `Ďakujeme za váš záujem, ${data.leadName}`,
    body:    `Dobrý deň ${data.leadName},\n\nďakujeme za váš záujem. Náš maklér vás bude kontaktovať čo najskôr.\n\nS pozdravom\n${data.agentName ?? 'Revolis.AI tím'}`,
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
    return extractJson<AutoReplyResult>(raw)
  })

  return withAiTimeout(aiCall, fallback, 500)
}
