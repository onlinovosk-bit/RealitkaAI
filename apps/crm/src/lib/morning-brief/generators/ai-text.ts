// ================================================================
// Revolis.AI — Morning Brief AI Text Generator
// ================================================================
import { callClaude, CLAUDE_HAIKU } from '@/lib/ai/claude'
import { withAiTimeout }            from '@/lib/ai/fallback'
import type { GatheredData }        from '../gather'
import type { BriefVariant }        from '@/types/morning-brief'

export interface GeneratedText {
  aiText:      string
  subjectLine: string
  actionVerb:  string
  actionText:  string
  urgency:     'high' | 'medium' | 'low'
}

const SYSTEM_A = `Si Revolis.AI — inteligentný realitný asistent pre slovenských maklérov.
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

const SYSTEM_B = `Si Revolis.AI — inteligentný realitný asistent pre slovenských maklérov.
Píšeš ranný brief po slovensky. Štýl: analytický ale zrozumiteľný.
Pravidlá:
- 4–5 viet celkom.
- Veta 1: Najsilnejší lead a konkrétny dôvod (BRI skóre, čo urobil).
- Veta 2: Prečo práve dnes je správny čas (nie vo všeobecnosti).
- Veta 3: Najdôležitejšia nočná zmena alebo príležitosť.
- Veta 4–5: Konkrétna dvojkroková akcia — čo spraviť a čo povedať.
Formát: len čistý text, bez Markdown.`

const SYSTEM_SUBJECT = `Napíš predmet e-mailu (max 60 znakov, slovensky, bez emoji). Musí obsahovať meno najhorúcejšieho leadu a BRI skóre. Formát: len text predmetu, nič iné.`

export async function generateBriefText(
  data:    GatheredData,
  variant: BriefVariant = 'A'
): Promise<GeneratedText> {
  const top     = data.hotLeads[0]
  const { overnight, stats } = data
  const context = buildContext(data)
  const system  = variant === 'A' ? SYSTEM_A : SYSTEM_B

  const fallback = buildFallbackText(data, variant)

  const aiCall = Promise.all([
    callClaude({
      model:      CLAUDE_HAIKU,
      max_tokens: 300,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role:    'user',
        content: `Napíš ranný brief pre makléra ${data.ownerName}.\n\nDÁTA:\n${context}\n\nDÔLEŽITÉ: Použij konkrétne meno "${top?.full_name ?? 'kontakt'}" a číslo skóre ${top?.bri_score ?? 0}. Odporúčanú akciu zaciľ presne — volanie pred 10:00, správu večer, atď.`,
      }],
    }, 'brief-text'),

    callClaude({
      model:      CLAUDE_HAIKU,
      max_tokens: 80,
      system: [{ type: 'text', text: SYSTEM_SUBJECT, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role:    'user',
        content: `Meno: ${top?.full_name ?? 'Lead'}, BRI: ${top?.bri_score ?? 0}, Trajectory: ${(top as any)?.trajectory ?? 'stable'}`,
      }],
    }, 'brief-subject'),
  ]).then(([briefMsg, subjectMsg]) => {
    const aiText     = (briefMsg.content[0]   as { text: string }).text.trim()
    const subjectLine = (subjectMsg.content[0] as { text: string }).text.trim()
    const urgency    = determineUrgency(top?.bri_score ?? 0, overnight)
    return {
      aiText,
      subjectLine,
      actionVerb: extractActionVerb(aiText),
      actionText: extractLastSentence(aiText),
      urgency,
    } satisfies GeneratedText
  })

  return withAiTimeout(aiCall, fallback, 800)
}

function buildContext(data: GatheredData): string {
  const { hotLeads, overnight, stats } = data
  const top   = hotLeads[0]
  const lines: string[] = []

  lines.push(`TOP LEAD: ${top?.full_name ?? 'Neznámy'} | BRI: ${top?.bri_score ?? 0}/100 | Trajectory: ${(top as any)?.trajectory ?? 'stable'}`)
  lines.push(`Dôvod skóre: recency=${top?.recency_score ?? 0}, engagement=${top?.engagement_score ?? 0}, source=${top?.source_score ?? 0}`)
  if (hotLeads.length > 1) lines.push(`2. LEAD: ${hotLeads[1]?.full_name ?? 'Neznámy'} | BRI: ${hotLeads[1]?.bri_score ?? 0}`)

  lines.push(`\nNOČNÉ ZMENY (posledných 10 hodín):`)
  lines.push(`- Nové dopyty: ${overnight.newLeads}`)
  lines.push(`- Odpovede: ${overnight.replies.length}`)
  lines.push(`- Zmeny LV: ${overnight.lvChanges.length}`)
  lines.push(`- Arbitráž: ${overnight.arbitrage.length}`)
  lines.push(`- Poklesy cien: ${overnight.priceDrops.length}`)

  if (overnight.replies[0])   lines.push(`  Odpoveď od: ${overnight.replies[0].leadName} (${overnight.replies[0].repliedAt.slice(11, 16)})`)
  if (overnight.lvChanges[0]) lines.push(`  LV zmena: ${overnight.lvChanges[0].address} (${overnight.lvChanges[0].changeType})`)
  if (overnight.arbitrage[0]) {
    const a = overnight.arbitrage[0]
    lines.push(`  Arbitráž: ${a.address} | delta ${a.delta.toLocaleString('sk')} € (${a.deltaPct}%)`)
  }

  lines.push(`\nPIPELINE: aktívnych: ${stats.activeLeads}, hot (>=60): ${stats.hotLeads}`)
  return lines.join('\n')
}

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
  return verbs.find(v => text.includes(v)) ?? 'Kontaktujte'
}

function extractLastSentence(text: string): string {
  const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 0)
  return sentences[sentences.length - 1]?.trim() ?? text
}

function buildFallbackText(data: GatheredData, variant: BriefVariant): GeneratedText {
  const top   = data.hotLeads[0]
  const score = top?.bri_score ?? 0
  const name  = top?.full_name ?? 'Váš top lead'
  const { overnight } = data

  const veta1 = `${name} má dnes BRI skóre ${score}/100 — najvyššia pripravenosť vo vašom pipeline.`
  const veta2 = overnight.replies.length > 0
    ? `${overnight.replies[0].leadName} odpovedal na vašu správu cez noc.`
    : overnight.lvChanges.length > 0
    ? `Zaznamenali sme zmenu na LV pre ${overnight.lvChanges[0].address}.`
    : overnight.newLeads > 0
    ? `Cez noc prišli ${overnight.newLeads} nové dopyty.`
    : `Pipeline je stabilný — ${data.stats.activeLeads} aktívnych leadov čaká.`
  const veta3 = score >= 75
    ? `Zavolajte ${name} dnes pred 10:00 — vysoké BRI skóre klesá bez kontaktu.`
    : `Pošlite ${name} follow-up správu dnes dopoludnia.`

  const aiText      = [veta1, veta2, veta3].join(' ')
  const subjectLine = `${name} · BRI ${score}/100 — ranný brief Revolis.AI`

  return {
    aiText,
    subjectLine,
    actionVerb: veta3.split(' ')[0],
    actionText: veta3,
    urgency:    determineUrgency(score, overnight),
  }
}
