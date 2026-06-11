import type { DashboardSummaryResponse } from '@/app/api/dashboard/summary/route'
import { estimateClaudeCostEur } from './llm-usage-cost'
import { callClaude, CLAUDE_HAIKU, extractJson } from './claude'
import { withAiTimeout } from './fallback'

export type PropertySnapshot = {
  id: string
  title: string
  location: string
  price: number
  status: string
}

export type DashboardInsightsInput = {
  period: 'today' | 'last_7_days'
  summary: DashboardSummaryResponse
  userName: string
  properties?: PropertySnapshot[]
}

export type DashboardInsightsAction = {
  title: string
  description: string
  recommendedChannel: 'call' | 'email' | 'sms' | 'meeting'
  relatedLeadIds: string[]
  impact: 'high' | 'medium' | 'low'
}

export type DashboardInsightsOutput = {
  headline: string
  summary: string
  actions: DashboardInsightsAction[]
  notesForOwner?: string
}

export type DashboardInsightsAudit = {
  source: 'llm' | 'fallback' | 'empty'
  model: string | null
  costEur: number | null
  latencyMs: number | null
}

export type GenerateDashboardInsightsResult = {
  insights: DashboardInsightsOutput
  audit: DashboardInsightsAudit
}

const SYSTEM = `Si Revolis.AI — inteligentný realitný asistent pre slovenských maklérov.
Analyzuješ dashboard dáta tenanta a navrhneš konkrétne, akčné odporúčania.
Pravidlá:
- Používaj VÝLUČNE dáta z poskytnutého JSON kontextu — nevymýšľaj mená, lokality ani čísla.
- Ak v dátach chýba informácia, nepíš ju — radšej buď stručný.
- Text po slovensky, priamy štýl, bez floskúl.
- relatedLeadIds musí obsahovať len ID leadov z kontextu (pole topHotLeads).
- Výstup je VŽDY validný JSON bez markdown.`

type LlmInsightsPayload = {
  headline: string
  summary: string
  actions: DashboardInsightsAction[]
  notesForOwner?: string
}

export function hasTenantData(summary: DashboardSummaryResponse): boolean {
  return (
    summary.totals.activeLeads > 0 ||
    summary.topHotLeads.length > 0 ||
    summary.totals.newLeads > 0
  )
}

export function buildEmptyInsights(userName: string): DashboardInsightsOutput {
  return {
    headline: `${userName}, zatiaľ tu nie sú dáta na AI analýzu.`,
    summary:
      'Keď pridáš leady alebo nehnuteľnosti, Revolis.AI ti tu zobrazí personalizované odporúčania z tvojich reálnych dát.',
    actions: [],
  }
}

function buildContext(input: DashboardInsightsInput): string {
  const { summary, period, properties = [] } = input
  const lines: string[] = [
    `Obdobie: ${period}`,
    `Nové leady: ${summary.totals.newLeads}`,
    `Aktívne leady: ${summary.totals.activeLeads}`,
    `Horúce leady (BRI >= 70): ${summary.totals.hotLeads}`,
    `Priemerné BRI: ${summary.buyerReadiness.averageScore}`,
    `Warm/Cold: ${summary.buyerReadiness.warmCount}/${summary.buyerReadiness.coldCount}`,
    `Hovory dnes: ${summary.activity.callsToday}`,
    `Emaily dnes: ${summary.activity.emailsToday}`,
  ]

  if (summary.topHotLeads.length) {
    lines.push('\nTOP LEADY:')
    for (const lead of summary.topHotLeads) {
      lines.push(
        `- id=${lead.id} | ${lead.name} | segment=${lead.segment} | readiness=${lead.readinessScore} | posledná aktivita=${lead.lastActivityAt}${lead.propertyInterestSummary ? ` | záujem=${lead.propertyInterestSummary}` : ''}`,
      )
    }
  }

  if (properties.length) {
    lines.push('\nAKTÍVNE NEHNUTEĽNOSTI:')
    for (const p of properties) {
      lines.push(
        `- id=${p.id} | ${p.title} | ${p.location} | ${p.price.toLocaleString('sk-SK')} € | ${p.status}`,
      )
    }
  }

  return lines.join('\n')
}

function sanitizeLeadIds(
  actions: DashboardInsightsAction[],
  validIds: Set<string>,
): DashboardInsightsAction[] {
  return actions.map(action => ({
    ...action,
    relatedLeadIds: action.relatedLeadIds.filter(id => validIds.has(id)),
  }))
}

export function buildDataFallback(input: DashboardInsightsInput): DashboardInsightsOutput {
  const { summary, userName } = input
  const top = summary.topHotLeads[0]
  const hotCount = summary.totals.hotLeads
  const activeCount = summary.totals.activeLeads

  const headline = top
    ? `${userName}, ${hotCount > 0 ? `${hotCount} horúcich leadov` : `${activeCount} aktívnych leadov`} — priorita: ${top.name}.`
    : `${userName}, máš ${activeCount} aktívnych leadov na dnešný plán.`

  const interestParts = summary.topHotLeads
    .slice(0, 3)
    .map(l => l.propertyInterestSummary || l.name)
    .filter(Boolean)

  const summaryText = interestParts.length
    ? `Najväčší potenciál vidíme u: ${interestParts.join('; ')}. Dnes si zaznamenal ${summary.activity.callsToday} hovorov a ${summary.activity.emailsToday} emailov.`
    : `Pipeline má ${activeCount} aktívnych leadov. Priemerné BRI je ${summary.buyerReadiness.averageScore}/100.`

  const actions: DashboardInsightsAction[] = []

  const hotLeads = summary.topHotLeads.slice(0, 3)
  if (hotLeads.length) {
    actions.push({
      title: `Kontaktuj ${hotLeads.map(l => l.name).join(', ')}`,
      description: `Títo klienti sú v top priorite podľa tvojich dát. Navrhni konkrétne nehnuteľnosti a dohodni ďalší krok.`,
      recommendedChannel: 'call',
      relatedLeadIds: hotLeads.map(l => l.id),
      impact: 'high',
    })
  }

  const warmLeads = summary.topHotLeads.slice(3, 5)
  if (warmLeads.length) {
    actions.push({
      title: `Follow-up pre ${warmLeads.map(l => l.name).join(', ')}`,
      description: 'Udrž kontakt a získaj signál o aktuálnom záujme.',
      recommendedChannel: 'email',
      relatedLeadIds: warmLeads.map(l => l.id),
      impact: 'medium',
    })
  }

  return { headline, summary: summaryText, actions }
}

export async function generateDashboardInsights(
  input: DashboardInsightsInput,
): Promise<GenerateDashboardInsightsResult> {
  const t0 = Date.now()
  if (!hasTenantData(input.summary)) {
    return {
      insights: buildEmptyInsights(input.userName),
      audit: { source: 'empty', model: null, costEur: null, latencyMs: 0 },
    }
  }

  const validLeadIds = new Set(input.summary.topHotLeads.map(l => l.id))
  const fallbackInsights = buildDataFallback(input)
  const context = buildContext(input)

  const aiCall = callClaude({
    model: CLAUDE_HAIKU,
    max_tokens: 700,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{
      role: 'user',
      content: `Maklér: ${input.userName}

DASHBOARD DÁTA:
${context}

Vráť JSON:
{
  "headline": "1 veta — dnešná priorita podľa reálnych čísel a mien z dát",
  "summary": "2-3 vety — kde je najväčší potenciál, len z poskytnutých leadov/nehnuteľností",
  "actions": [
    {
      "title": "Konkrétna akcia s menom leadu z dát",
      "description": "Prečo a ako — max 2 vety, len fakty z kontextu",
      "recommendedChannel": "call|email|sms|meeting",
      "relatedLeadIds": ["id z topHotLeads"],
      "impact": "high|medium|low"
    }
  ],
  "notesForOwner": "Voliteľná 1 veta pre ownera — len ak má zmysel z dát, inak prázdny reťazec"
}`,
    }],
  }, 'dashboard-insights').then(resp => {
    const latencyMs = Date.now() - t0
    const raw = resp.content[0].type === 'text' ? resp.content[0].text : ''
    const parsed = extractJson<LlmInsightsPayload>(raw)
    return {
      insights: {
        headline: parsed.headline?.trim() || fallback.headline,
        summary: parsed.summary?.trim() || fallback.summary,
        actions: sanitizeLeadIds(parsed.actions ?? [], validLeadIds),
        notesForOwner: parsed.notesForOwner?.trim() || undefined,
      },
      audit: {
        source: 'llm' as const,
        model: CLAUDE_HAIKU,
        costEur: estimateClaudeCostEur(CLAUDE_HAIKU, resp.usage.input_tokens, resp.usage.output_tokens),
        latencyMs: Date.now() - t0,
      },
    }
  })

  const result = await withAiTimeout(aiCall, {
    insights: fallback,
    audit: { source: 'fallback' as const, model: CLAUDE_HAIKU, costEur: null, latencyMs: 0 },
  }, 800)
  if (result.audit.source === 'fallback') result.audit.latencyMs = Date.now() - t0
  return result
}
