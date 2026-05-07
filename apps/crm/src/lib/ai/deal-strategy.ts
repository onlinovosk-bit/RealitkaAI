import { callClaude, CLAUDE_HAIKU, extractJson } from './claude'
import { withAiTimeout }                          from './fallback'

export type DealStrategy = {
  summary:          string
  nextSteps:        string[]
  objections:       string[]
  closingTechnique: string
}

const SYSTEM = `Si expert realitný stratég pre slovenský trh. \
Analyzuješ lead dáta a navrhneš konkrétnu obchodnú stratégiu. \
Buď špecifický — nie generický. Výstup je VŽDY validný JSON bez markdown.`

function fallback(score: number): DealStrategy {
  return {
    summary:          score >= 70 ? 'Vysoká priorita — konaj dnes' : 'Stredná priorita — sleduj',
    nextSteps:        ['Zavolať do 24 hodín', 'Pripraviť cenovú ponuku', 'Navrhnúť termín obhliadky'],
    objections:       ['Cena je príliš vysoká', 'Ešte nie sme rozhodnutí', 'Pozeráme aj iné možnosti'],
    closingTechnique: score >= 70 ? 'Urgency close' : 'Value close',
  }
}

export async function generateDealStrategy(
  lead: Record<string, unknown>
): Promise<DealStrategy> {
  const score = typeof lead.score === 'number' ? lead.score : 50

  const safeData = {
    status:        lead.status,
    score,
    bri_score:     lead.bri_score,
    budget:        lead.budget,
    location:      lead.location,
    property_type: lead.property_type,
    rooms:         lead.rooms,
    financing:     lead.financing,
    timeline:      lead.timeline,
    last_contact_at: lead.last_contact_at,
    created_at:    lead.created_at,
  }

  const aiCall = callClaude({
    model:      CLAUDE_HAIKU,
    max_tokens: 350,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{
      role:    'user',
      content: `Lead dáta: ${JSON.stringify(safeData, null, 2)}

Vráť JSON:
{
  "summary": "1-2 vety — situácia leadu a odporúčaná stratégia",
  "nextSteps": ["3 konkrétne kroky v poradí priorít — imperatív, max 10 slov každý"],
  "objections": ["2-3 pravdepodobné námietky tohto konkrétneho leadu"],
  "closingTechnique": "Konkrétna uzatvárajúca technika vhodná pre tento profil — 1 veta"
}`,
    }],
  }, 'deal-strategy').then(resp => {
    const raw = resp.content[0].type === 'text' ? resp.content[0].text : ''
    return extractJson<DealStrategy>(raw)
  })

  return withAiTimeout(aiCall, fallback(score), 500)
}
