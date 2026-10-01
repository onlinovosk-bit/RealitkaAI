import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { withAiTimeout } from '../fallback'

/**
 * `withAiTimeout` predtým robil `promise.catch(() => fallback)` bez akejkoľvek stopy —
 * preto sa výpadok AI po 22. 9. nedal zistiť. Tieto testy držia dve veci naraz:
 * správanie sa nezmenilo (vždy záloha, nikdy výnimka) a každé zlyhanie je vidieť.
 */

let warn: MockInstance

beforeEach(() => {
  vi.useFakeTimers()
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  warn.mockRestore()
})

const lines = () => warn.mock.calls.map((c) => JSON.parse(c[0] as string) as Record<string, unknown>)

function reject(status: number, afterMs = 0): Promise<never> {
  return new Promise((_, rej) => {
    setTimeout(() => rej(Object.assign(new Error('x'), { status })), afterMs)
  })
}

describe('withAiTimeout — správanie zostáva', () => {
  it('vráti hodnotu, keď sľub uspeje včas', async () => {
    const p = withAiTimeout(Promise.resolve('LLM'), 'FALLBACK', 500, { feature: 't' })
    await expect(p).resolves.toBe('LLM')
  })

  it('vráti zálohu pri odmietnutí', async () => {
    const p = withAiTimeout(reject(401), 'FALLBACK', 500, { feature: 't' })
    await vi.advanceTimersByTimeAsync(0)
    await expect(p).resolves.toBe('FALLBACK')
  })

  it('vráti zálohu po vypršaní okna', async () => {
    const p = withAiTimeout(new Promise<string>(() => {}), 'FALLBACK', 500, { feature: 't' })
    await vi.advanceTimersByTimeAsync(500)
    await expect(p).resolves.toBe('FALLBACK')
  })

  it('nikdy nehádže, ani keď sľub odmietne ne-chybou', async () => {
    const p = withAiTimeout(Promise.reject('boom'), 'FALLBACK', 500)
    await expect(p).resolves.toBe('FALLBACK')
  })

  it('bez štvrtého parametra funguje ako predtým (spätná kompatibilita)', async () => {
    await expect(withAiTimeout(Promise.resolve(1), 2)).resolves.toBe(1)
  })
})

describe('withAiTimeout — každé zlyhanie je vidieť', () => {
  it('úspech nezaloguje nič — ani falošný timeout po tom, čo sľub skončil', async () => {
    const p = withAiTimeout(Promise.resolve('LLM'), 'FALLBACK', 500, { feature: 't' })
    await p
    await vi.advanceTimersByTimeAsync(5_000)
    expect(warn).not.toHaveBeenCalled()
  })

  it('po úspechu ani po odmietnutí nezostane visieť časovač', async () => {
    await withAiTimeout(Promise.resolve('LLM'), 'FALLBACK', 500, { feature: 't' })
    expect(vi.getTimerCount()).toBe(0)

    const p = withAiTimeout(reject(500), 'FALLBACK', 500, { feature: 't' })
    await vi.advanceTimersByTimeAsync(0)
    await p
    expect(vi.getTimerCount()).toBe(0)
  })

  it('odmietnutie → jeden AI_CALL_FAILED s kódom dôvodu a názvom funkcie', async () => {
    const p = withAiTimeout(reject(401), 'FALLBACK', 500, { feature: 'dashboard_insights' })
    await vi.advanceTimersByTimeAsync(0)
    await p
    expect(lines()).toHaveLength(1)
    expect(lines()[0]).toMatchObject({
      status: 'AI_CALL_FAILED',
      feature: 'dashboard_insights',
      reason: 'auth',
      http_status: 401,
      after_timeout: false,
    })
  })

  it('vypršanie okna → reason timeout', async () => {
    const p = withAiTimeout(new Promise<string>(() => {}), 'FALLBACK', 500, { feature: 'inbound_auto_reply' })
    await vi.advanceTimersByTimeAsync(500)
    await p
    expect(lines()).toHaveLength(1)
    expect(lines()[0]).toMatchObject({ feature: 'inbound_auto_reply', reason: 'timeout', http_status: null })
  })

  it('pozdné odmietnutie po timeoute zaloguje skutočnú príčinu (after_timeout)', async () => {
    const p = withAiTimeout(reject(429, 1_000), 'FALLBACK', 500, { feature: 't' })
    await vi.advanceTimersByTimeAsync(500)
    await expect(p).resolves.toBe('FALLBACK')
    await vi.advanceTimersByTimeAsync(600)
    expect(lines().map((l) => [l.reason, l.after_timeout])).toEqual([
      ['timeout', false],
      ['rate_limit', true],
    ])
  })

  it('pozdný úspech po timeoute nezaloguje nič navyše', async () => {
    const late = new Promise<string>((res) => setTimeout(() => res('neskoro'), 1_000))
    const p = withAiTimeout(late, 'FALLBACK', 500, { feature: 't' })
    await vi.advanceTimersByTimeAsync(1_500)
    await expect(p).resolves.toBe('FALLBACK')
    expect(lines()).toHaveLength(1)
  })

  it('bez `feature` sa loguje ako unlabeled', async () => {
    const p = withAiTimeout(reject(500), 'FALLBACK', 500)
    await vi.advanceTimersByTimeAsync(0)
    await p
    expect(lines()[0].feature).toBe('unlabeled')
  })
})

describe('withAiTimeout — onFailure', () => {
  it('zavolá sa presne raz s klasifikovanou chybou (odmietnutie)', async () => {
    const onFailure = vi.fn()
    const p = withAiTimeout(reject(401), 'FALLBACK', 500, { feature: 't', onFailure })
    await vi.advanceTimersByTimeAsync(0)
    await p
    expect(onFailure).toHaveBeenCalledTimes(1)
    expect(onFailure.mock.calls[0][0]).toMatchObject({ reason: 'auth', httpStatus: 401 })
  })

  it('pri timeoute sa zavolá raz s `timeout`; pozdné odmietnutie ho nezavolá druhýkrát', async () => {
    const onFailure = vi.fn()
    const p = withAiTimeout(reject(401, 1_000), 'FALLBACK', 500, { feature: 't', onFailure })
    await vi.advanceTimersByTimeAsync(1_500)
    await p
    expect(onFailure).toHaveBeenCalledTimes(1)
    expect(onFailure.mock.calls[0][0].reason).toBe('timeout')
  })

  it('pri úspechu sa nevolá', async () => {
    const onFailure = vi.fn()
    await withAiTimeout(Promise.resolve('LLM'), 'FALLBACK', 500, { feature: 't', onFailure })
    await vi.advanceTimersByTimeAsync(5_000)
    expect(onFailure).not.toHaveBeenCalled()
  })

  it('výnimka v onFailure nezmení výsledok', async () => {
    const p = withAiTimeout(reject(500), 'FALLBACK', 500, {
      feature: 't',
      onFailure: () => {
        throw new Error('diagnostika sa rozpadla')
      },
    })
    await vi.advanceTimersByTimeAsync(0)
    await expect(p).resolves.toBe('FALLBACK')
  })
})
