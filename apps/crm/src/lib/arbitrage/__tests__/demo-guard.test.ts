import { afterEach, describe, expect, it, vi } from 'vitest'
import { isArbitrageDemoAllowed } from '../demo-guard'

describe('isArbitrageDemoAllowed', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns false in production even when ARBITRAGE_DEMO_MODE=true', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('ARBITRAGE_DEMO_MODE', 'true')
    expect(isArbitrageDemoAllowed()).toBe(false)
  })

  it('returns false in development when ARBITRAGE_DEMO_MODE is not true', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('ARBITRAGE_DEMO_MODE', 'false')
    expect(isArbitrageDemoAllowed()).toBe(false)
  })

  it('returns true in development when ARBITRAGE_DEMO_MODE=true', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('ARBITRAGE_DEMO_MODE', 'true')
    expect(isArbitrageDemoAllowed()).toBe(true)
  })
})
