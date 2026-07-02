// ================================================================
// Revolis.AI — Morning Brief AI Text Generator
// ================================================================
import { callClaude, CLAUDE_HAIKU } from '@/lib/ai/claude'
import type { GatheredData }        from '../gather'
import type {
  BriefContentSource,
  BriefFallbackReason,
  BriefVariant,
} from '@/types/morning-brief'

export interface GeneratedText {
  aiText:      string
  subjectLine: string
  actionVerb:  string
  actionText:  string
  urgency:     'high' | 'medium' | 'low'
  contentSource: BriefContentSource
  fallbackReason: BriefFallbackReason | null
}

const AI_TIMEOUT_MS = 800

const SYSTEM_A = `Si Revolis.AI — inteligentný realitný asistent pre slovenských maklérov.
Píšeš ranný brief VÝLUČNE po slovensky. Max 300 slov. Žiadny marketing jazyk.
Štýl: priamy, konkrétny, akčný — nie všeobecné rady.

Štruktúra (v tomto poradí, bez emoji v texte):
1) DNEŠNÉ ČÍSLA — leady čakajúce na kontakt, HOT leady, neodpovedané >48h (konkrétne čísla z dát).
2) TOP 3 PRIORITY — mená + jedna veta dôvodu urgentnosti pre každého (max 3).
3) PIPELINE — hodnota pipeline v EUR ak je v dátach.
4) TIP DŇA — jeden konkrétny tip podľa stavu pipeline (nie generický).
5) AKCIA — jedna presná akcia s časovým oknom (napr. pred 10:00).

Formát: krátke odseky, bez Markdown, bez odrážok.`

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
  const { overnight } = data
  const context = buildContext(data)
  const system  = variant === 'A' ? SYSTEM_A : SYSTEM_B

  const fallback = withSourceMeta(buildFallbackText(data, variant), 'fallback', 'timeout')

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
    return withSourceMeta({
      aiText,
      subjectLine,
      actionVerb: extractActionVerb(aiText),
      actionText: extractLastSentence(aiText),
      urgency,
    }, 'llm', null)
  })

  return raceBriefAi(aiCall, fallback, AI_TIMEOUT_MS)
}

function withSourceMeta(
  base: Omit<GeneratedText, 'contentSource' | 'fallbackReason'>,
  contentSource: BriefContentSource,
  fallbackReason: BriefFallbackReason | null,
): GeneratedText {
  return { ...base, contentSource, fallbackReason }
}

async function raceBriefAi(
  aiCall: Promise<GeneratedText>,
  fallback: GeneratedText,
  ms: number,
): Promise<GeneratedText> {
  let apiError = false

  const aiTracked = aiCall.catch(() => {
    apiError = true
    return withSourceMeta(stripSourceMeta(fallback), 'fallback', 'api_error')
  })

  const timeout = new Promise<GeneratedText>((resolve) => {
    const id = setTimeout(
      () => resolve(withSourceMeta(stripSourceMeta(fallback), 'fallback', 'timeout')),
      ms,
    )
    if (typeof id === 'object' && 'unref' in id) id.unref()
  })

  const result = await Promise.race([aiTracked, timeout])
  if (result.contentSource === 'llm') return result
  if (apiError) return withSourceMeta(stripSourceMeta(result), 'fallback', 'api_error')
  return result
}

function stripSourceMeta(text: GeneratedText): Omit<GeneratedText, 'contentSource' | 'fallbackReason'> {
  const { contentSource: _s, fallbackReason: _r, ...rest } = text
  return rest
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
  lines.push(`Čakajú na kontakt: ${stats.pendingContact} (z toho HOT: ${stats.hotPending})`)
  lines.push(`Neodpovedané >48h: ${stats.staleContacts48h}`)
  lines.push(`Hodnota pipeline: ${stats.pipelineValueEur.toLocaleString('sk')} €`)
  if (stats.priorityLeadNames.length) {
    lines.push(`Priority leady: ${stats.priorityLeadNames.join(', ')}`)
  }
  lines.push(`Zmeny cien nehnuteľností: ${stats.priceDropCount}`)
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

export function buildDeliveryFallbackText(
  data: GatheredData,
  hotLeads: number,
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.revolis.ai'
  return [
    '🌅 Dobré ráno!',
    '',
    `Dnes máte ${hotLeads} HOT leadov čakajúcich na kontakt.`,
    `Neodpovedané správy staršie ako 48h: ${data.stats.staleContacts48h}.`,
    'Systém momentálne generuje váš personalizovaný brief — skúste znova o 10 minút.',
    '',
    `Priamy odkaz na leady: ${baseUrl}/leads`,
  ].join('\n')
}

function buildFallbackText(
  data: GatheredData,
  _variant: BriefVariant,
): Omit<GeneratedText, 'contentSource' | 'fallbackReason'> {
  const top   = data.hotLeads[0]
  const score = top?.bri_score ?? 0
  const name  = top?.full_name ?? data.stats.priorityLeadNames[0] ?? 'Váš top lead'
  const { overnight, stats } = data

  const veta1 = `Dnes čaká ${stats.pendingContact} leadov na kontakt (${stats.hotPending} HOT). Pipeline: ${stats.pipelineValueEur.toLocaleString('sk')} €.`
  const veta2 = top
    ? `${name} má BRI ${score}/100 — priorita č. 1.`
    : stats.priorityLeadNames.length
    ? `Priority: ${stats.priorityLeadNames.slice(0, 3).join(', ')}.`
    : overnight.replies.length > 0
    ? `${overnight.replies[0].leadName} odpovedal cez noc.`
    : `Neodpovedané >48h: ${stats.staleContacts48h}.`
  const veta3 = score >= 75
    ? `Zavolajte ${name} dnes pred 10:00.`
    : stats.staleContacts48h > 0
    ? `Najprv kontaktujte ${stats.staleContacts48h} leadov bez odpovede >48h.`
    : `Pošlite follow-up top 3 priority dnes dopoludnia.`

  const aiText      = [veta1, veta2, veta3].join(' ')
  const subjectLine = `${name} · brief Revolis.AI`

  return {
    aiText,
    subjectLine,
    actionVerb: veta3.split(' ')[0],
    actionText: veta3,
    urgency:    determineUrgency(score, overnight),
  }
}
