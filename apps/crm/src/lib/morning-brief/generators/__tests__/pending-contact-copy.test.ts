// ================================================================
// Revolis.AI — the brief never prints an unmeasured contact number
//
// `pendingContact` used to be the broker's whole active book, and the copy
// around it made the claim explicit: "Dnes čaká 142 leadov na kontakt
// (1 HOT)". Now it is nullable, so two things have to hold:
//
//   1. a `null` must never reach the reader as "null", "0" or an invented
//      number — it is reported as not measured, or the sentence is rebuilt
//      out of numbers that do exist;
//   2. the label must say what is counted — leads with no RECORDED contact —
//      and not claim knowledge of the broker's phone calls.
//
// The system prompt is part of this: it used to ORDER the model to state
// "leady čakajúce na kontakt" as a concrete number, which would have made it
// invent one the moment the data said "nemerané".
// ================================================================
import { beforeEach, describe, expect, it, vi } from 'vitest'

const callClaudeMock = vi.fn()

vi.mock('@/lib/ai/claude', () => ({
  callClaude: (...args: unknown[]) => callClaudeMock(...args),
  CLAUDE_HAIKU: 'claude-haiku-test',
}))

import { generateBriefText } from '../ai-text'
import type { GatheredData } from '../../gather'

function gathered(stats: Partial<GatheredData['stats']> = {}): GatheredData {
  return {
    settings: { a_b_variant: 'A', channels: ['email'] } as unknown as GatheredData['settings'],
    ownerName: 'Test Maklér',
    ownerEmail: 'test@example.com',
    hotLeads: [],
    overnight: { newLeads: 0, lvChanges: [], arbitrage: [], priceDrops: [], replies: [] },
    stats: {
      hotLeads: 2,
      activeLeads: 142,
      newInquiries: 0,
      scoreIncreases: 0,
      weeklyRevForecast: null,
      pendingContact: null,
      hotPending: null,
      staleContacts48h: null,
      pipelineValueEur: 892_000,
      priorityLeadNames: [],
      priceDropCount: 0,
      ...stats,
    },
  }
}

/** Captures the user prompt the model would have received, then fails the call. */
function captureThenFail() {
  const prompts: string[] = []
  callClaudeMock.mockImplementation((req: { messages: { content: string }[] }) => {
    prompts.push(req.messages[0].content)
    return Promise.reject(new Error('no api in tests'))
  })
  return prompts
}

describe('morning brief copy — pendingContact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('tells the model the number is not measured, and not to write about it', async () => {
    const prompts = captureThenFail()

    await generateBriefText(gathered({ pendingContact: null }), 'A')

    const briefPrompt = prompts.find((p) => p.includes('DÁTA:')) ?? ''
    expect(briefPrompt).toContain('Bez zaznamenaného kontaktu: nemerané')
    expect(briefPrompt).toContain('o tomto čísle nepíš')
    // The old shape handed over a bare count here.
    expect(briefPrompt).not.toMatch(/Čakajú na kontakt: \d/)
  })

  it('hands over the real count once it is measurable', async () => {
    const prompts = captureThenFail()

    await generateBriefText(gathered({ pendingContact: 11, hotPending: 2 }), 'A')

    const briefPrompt = prompts.find((p) => p.includes('DÁTA:')) ?? ''
    expect(briefPrompt).toContain('Bez zaznamenaného kontaktu: 11 (z toho HOT: 2)')
    expect(briefPrompt).not.toContain('nemerané (zatiaľ žiadny zaznamenaný kontakt)')
  })

  it('omits the HOT clause when only the hot number is unmeasurable', async () => {
    const prompts = captureThenFail()

    await generateBriefText(gathered({ pendingContact: 11, hotPending: null }), 'A')

    const briefPrompt = prompts.find((p) => p.includes('DÁTA:')) ?? ''
    expect(briefPrompt).toContain('Bez zaznamenaného kontaktu: 11')
    expect(briefPrompt).not.toContain('z toho HOT')
  })

  it('never writes "null" or a fabricated count into the fallback text', async () => {
    captureThenFail()

    const out = await generateBriefText(gathered({ pendingContact: null }), 'A')

    expect(out.contentSource).toBe('fallback')
    expect(out.aiText).not.toContain('null')
    expect(out.aiText).not.toContain('NaN')
    expect(out.aiText).not.toContain('undefined')
    // And it must not quietly reuse the active book as the waiting count.
    expect(out.aiText).not.toContain('142 leadov na kontakt')
    // It leads with what the data does support.
    expect(out.aiText).toContain('Aktívnych leadov: 142')
  })

  it('uses the measured count in the fallback text when there is one', async () => {
    captureThenFail()

    const out = await generateBriefText(gathered({ pendingContact: 11, hotPending: 2 }), 'A')

    expect(out.aiText).toContain('Bez zaznamenaného kontaktu: 11 leadov (2 HOT)')
  })

  it('does not order the model to state a waiting count it may not have', async () => {
    const prompts: string[] = []
    callClaudeMock.mockImplementation((req: { system: { text: string }[] }) => {
      prompts.push(req.system[0].text)
      return Promise.reject(new Error('no api in tests'))
    })

    await generateBriefText(gathered({ pendingContact: null }), 'A')

    const system = prompts.find((p) => p.includes('DNEŠNÉ ČÍSLA')) ?? ''
    expect(system, 'no system prompt captured').not.toBe('')
    // The instruction used to name "leady čakajúce na kontakt" as a required
    // concrete number, which contradicts the data saying "nemerané".
    expect(system).not.toContain('leady čakajúce na kontakt')
    expect(system).toContain('nemerané')
    expect(system).toContain('NEDOPLŇUJ')
  })
})
