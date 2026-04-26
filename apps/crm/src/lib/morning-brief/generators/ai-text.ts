// ================================================================
// Revolis.AI — Morning Brief AI Text Generator
// Uses Claude claude-sonnet-4-20250514 to write the 3-sentence brief
// ================================================================
import Anthropic from '@anthropic-ai/sdk'
import type { GatheredData }   from '../gather'
import type { BriefVariant }   from '@/types/morning-brief'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export interface GeneratedText {
  aiText:      string    // the 3-sentence brief body
  subjectLine: string    // email subject line
  actionVerb:  string    // "Zavolajte", "Pošlite", etc.
  actionText:  string    // full action sentence
  urgency:     'high' | 'medium' | 'low'
}

// ── Variant A — ultra concise (3 sentences) ───────────────────
const SYSTEM_PROMPT_A = `Si Revolis.AI — inteligentný realitný asistent pre slovenských maklérov.
Píšeš ranný brief VÝLUČNE po slovensky. Štýl: priamy, konkrétny, žiadne floskuly.
Pravidlá:
- Presne 3 vety. Nie 2, nie 4. Presne 3.
- Každá veta začína iným slovom ako predchádzajúca.
- Žiadne "V súhrne", "Dobrý deň" ani iné intro/outro.
- Veta 1: Kto je najhorúcejší a prečo (čísla).
- Veta 2: Najdôležitejšia nočná zmena (ak žiadna: situácia v pipeline).
- Veta 3: Jedna konkrétna akcia s časovým oknom.
- Veta 3 NIKDY nezačína "Odporúčam" ani "Je vhodné".
Formát: len čistý text, bez Markdown, bez odrážok.`

// ── Variant B — full briefing with context ────────────────────
const SYSTEM_PROMPT_B = `Si Revolis.AI — inteligentný realitný asistent pre slovenských maklérov.
Píšeš ranný brief po slovensky. Štýl: analytický ale zrozumiteľný.
Pravidlá:
- 4–5 viet celkom.
- Veta 1: Najsilnejší lead a konkrétny dôvod (BRI skóre, čo urobil).
- Veta 2: Prečo práve dnes je správny čas (nie vo všeobecnosti).
- Veta 3: Najdôležitejšia nočná zmena alebo príležitosť.
- Veta 4–5: Konkrétna dvojkroková akcia — čo spraviť a čo povedať.
Formát: len čistý text, bez Markdown.`

export async function generateBriefText(
  data:    GatheredData,
  variant: BriefVariant = 'A'
): Promise<GeneratedText> {
  const top    = data.hotLeads[0]
  const second = data.hotLeads[1]
  const { overnight, stats } = data

  // Build structured context for Claude
  const context = buildContext(data)

  try {
    const message = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 300,
      system:     variant === 'A' ? SYSTEM_PROMPT_A : SYSTEM_PROMPT_B,
      messages: [
        {
          role:    'user',
          content: `Napíš ranný brief pre makléra ${data.ownerName}.

DÁTA:
${context}

DÔLEŽITÉ: Použij konkrétne meno "${top?.full_name ?? 'kontakt'}" a číslo skóre ${top?.bri_score ?? 0}.
Odporúčanú akciu zaciľ presne — volanie pred 10:00, správu večer, atď.`,
        },
      ],
    })

    const aiText = (message.content[0] as { text: string }).text.trim()

    // Generate subject line separately
    const subjectMsg = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 80,
      system:     'Napíš predmet e-mailu (max 60 znakov, slovensky, bez emoji). Musí obsahovať meno najhorúcejšieho leadu a BRI skóre. Formát: len text predmetu, nič iné.',
      messages: [
        {
          role:    'user',
          content: `Meno: ${top?.full_name ?? 'Lead'}, BRI: ${top?.bri_score ?? 0}, Trajectory: ${(top as any)?.trajectory ?? 'stable'}`,
        },
      ],
    })
    const subjectLine = (subjectMsg.content[0] as { text: string }).text.trim()

    // Determine action from the brief text
    const urgency = determineUrgency(top?.bri_score ?? 0, overnight)

    return {
      aiText,
      subjectLine,
      actionVerb: extractActionVerb(aiText),
      actionText: extractLastSentence(aiText),
      urgency,
    }

  } catch (err) {
    console.error('[brief ai-text] Claude API error:', err)
    // Deterministic fallback — no AI needed
    return buildFallbackText(data, variant)
  }
}

// ── Context builder for Claude prompt ────────────────────────
function buildContext(data: GatheredData): string {
  const { hotLeads, overnight, stats, settings } = data
  const top = hotLeads[0]
  const lines: string[] = []

  lines.push(`TOP LEAD: ${top?.full_name ?? 'Neznámy'} | BRI: ${top?.bri_score ?? 0}/100 | Trajectory: ${(top as any)?.trajectory ?? 'stable'}`)
  lines.push(`Dôvod skóre: recency=${top?.recency_score ?? 0}, engagement=${top?.engagement_score ?? 0}, source=${top?.source_score ?? 0}`)

  if (hotLeads.length > 1) {
    lines.push(`2. LEAD: ${hotLeads[1]?.full_name ?? 'Neznámy'} | BRI: ${hotLeads[1]?.bri_score ?? 0}`)
  }

  lines.push(``)
  lines.push(`NOČNÉ ZMENY (posledných 10 hodín):`)
  lines.push(`- Nové dopyty: ${overnight.newLeads}`)
  lines.push(`- Odpovede na správy: ${overnight.replies.length}`)
  lines.push(`- Zmeny na LV: ${overnight.lvChanges.length}`)
  lines.push(`- Arbitrážne príl.: ${overnight.arbitrage.length}`)
  lines.push(`- Poklesy cien: ${overnight.priceDrops.length}`)

  if (overnight.replies.length > 0) {
    lines.push(`  Odpoveď od: ${overnight.replies[0].leadName} (${overnight.replies[0].repliedAt.slice(11, 16)})`)
  }

  if (overnight.lvChanges.length > 0) {
    lines.push(`  LV zmena: ${overnight.lvChanges[0].address} (${overnight.lvChanges[0].changeType})`)
  }

  if (overnight.arbitrage.length > 0) {
    const a = overnight.arbitrage[0]
    lines.push(`  Arbitráž: ${a.address} | delta ${a.delta.toLocaleString('sk')} € (${a.deltaPct}%)`)
  }

  lines.push(``)
  lines.push(`PIPELINE: aktívnych leadov: ${stats.activeLeads}, hot (>=60): ${stats.hotLeads}`)

  return lines.join('\n')
}

// ── Urgency classifier ────────────────────────────────────────
function determineUrgency(
  topScore: number,
  overnight: GatheredData['overnight']
): 'high' | 'medium' | 'low' {
  if (topScore >= 80 || overnight.replies.length > 0) return 'high'
  if (topScore >= 60 || overnight.lvChanges.length > 0) return 'medium'
  return 'low'
}

function extractActionVerb(text: string): string {
  const verbs = ['Zavolajte', 'Pošlite', 'Navštívte', 'Napíšte', 'Kontaktujte', 'Dohodnite']
  for (const v of verbs) {
    if (text.includes(v)) return v
  }
  return 'Kontaktujte'
}

function extractLastSentence(text: string): string {
  const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 0)
  return sentences[sentences.length - 1]?.trim() ?? text
}

// ── Deterministic fallback (no AI) ───────────────────────────
function buildFallbackText(data: GatheredData, variant: BriefVariant): GeneratedText {
  const top   = data.hotLeads[0]
  const score = top?.bri_score ?? 0
  const name  = top?.full_name ?? 'Váš top lead'
  const { overnight } = data

  let veta1 = `${name} má dnes BRI skóre ${score}/100 — najvyššia pripravenosť vo vašom pipeline.`

  let veta2 = overnight.replies.length > 0
    ? `${overnight.replies[0].leadName} odpovedal na vašu správu cez noc.`
    : overnight.lvChanges.length > 0
    ? `Zaznamenali sme zmenu na LV pre ${overnight.lvChanges[0].address}.`
    : overnight.newLeads > 0
    ? `Cez noc prišli ${overnight.newLeads} nové${overnight.newLeads === 1 ? '' : overnight.newLeads < 5 ? 'é' : ''} dopyty.`
    : `Pipeline je stabilný — ${data.stats.activeLeads} aktívnych leadov čaká.`

  let veta3 = score >= 75
    ? `Zavolajte ${name} dnes pred 10:00 — vysoké BRI skóre klesá bez kontaktu.`
    : `Pošlite ${name} follow-up správu dnes dopoludnia.`

  const aiText     = [veta1, veta2, veta3].join(' ')
  const subjectLine = `${name} · BRI ${score}/100 — ranný brief Revolis.AI`

  return {
    aiText,
    subjectLine,
    actionVerb: veta3.split(' ')[0],
    actionText: veta3,
    urgency:    determineUrgency(score, overnight),
  }
}
