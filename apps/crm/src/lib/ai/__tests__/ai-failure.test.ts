import { describe, expect, it, vi } from 'vitest'
import { classifyAiError, reportAiFailure } from '../ai-failure'

/** Tvar chyby z @anthropic-ai/sdk: `status`, `type`, `requestID`, `error` (telo), `headers`. */
function apiError(status: number | null, over: Record<string, unknown> = {}): Error {
  const { message, ...rest } = over
  return Object.assign(new Error(typeof message === 'string' ? message : 'chyba'), { status, ...rest })
}

describe('classifyAiError — HTTP status → kód dôvodu', () => {
  it.each([
    [401, 'auth'],
    [403, 'auth'],
    [402, 'billing'],
    [404, 'not_found'],
    [429, 'rate_limit'],
    [529, 'overloaded'],
    [500, 'server_error'],
    [503, 'server_error'],
    [400, 'invalid_request'],
    [413, 'invalid_request'],
    [422, 'invalid_request'],
  ])('HTTP %s → %s', (status, reason) => {
    const f = classifyAiError(apiError(status))
    expect(f.reason).toBe(reason)
    expect(f.httpStatus).toBe(status)
  })

  it('400 s hláškou o kredite je billing, nie invalid_request', () => {
    const f = classifyAiError(
      apiError(400, { message: 'Your credit balance is too low to access the Anthropic API.' }),
    )
    expect(f.reason).toBe('billing')
    expect(f.httpStatus).toBe(400)
  })

  it('billing_error v tele odpovede je billing aj bez HTTP 402', () => {
    expect(classifyAiError(apiError(400, { type: 'billing_error' })).reason).toBe('billing')
  })

  it('správa o kredite pri 5xx sa nepovažuje za billing (tú vetu smie povedať len 4xx)', () => {
    expect(classifyAiError(apiError(500, { message: 'credit balance' })).reason).toBe('server_error')
  })
})

describe('classifyAiError — chyby bez HTTP statusu', () => {
  it('chýbajúci kľúč je config', () => {
    expect(classifyAiError(new Error('ANTHROPIC_API_KEY nie je nastavený')).reason).toBe('config')
  })

  it('zlyhanie spojenia je network (názov triedy aj text)', () => {
    class APIConnectionError extends Error {}
    expect(classifyAiError(new APIConnectionError('x')).reason).toBe('network')
    expect(classifyAiError(new TypeError('fetch failed')).reason).toBe('network')
  })

  it('nespracovateľný výstup modelu je bad_output', () => {
    expect(classifyAiError(new Error('AI returned invalid JSON: {"a"')).reason).toBe('bad_output')
    expect(classifyAiError(new SyntaxError('Unexpected token')).reason).toBe('bad_output')
  })

  it('všetko ostatné je unknown a nikdy nehádže', () => {
    for (const v of [new Error('niečo'), null, undefined, 'boom', 42, {}]) {
      expect(() => classifyAiError(v)).not.toThrow()
      expect(classifyAiError(v).reason).toBe('unknown')
    }
  })
})

describe('classifyAiError — metadáta', () => {
  it('typ chyby berie z `type` aj z tvaru tela { error: { type } }', () => {
    expect(classifyAiError(apiError(429, { type: 'rate_limit_error' })).errorType).toBe('rate_limit_error')
    expect(
      classifyAiError(apiError(400, { error: { type: 'error', error: { type: 'invalid_request_error' } } })).errorType,
    ).toBe('invalid_request_error')
  })

  it('request-id berie z `requestID` aj z hlavičky', () => {
    expect(classifyAiError(apiError(401, { requestID: 'req_abc' })).requestId).toBe('req_abc')
    const headers = new Headers({ 'request-id': 'req_hdr' })
    expect(classifyAiError(apiError(401, { headers })).requestId).toBe('req_hdr')
    expect(classifyAiError(apiError(401)).requestId).toBeNull()
  })

  it('názov triedy chyby sa zachová', () => {
    class AuthenticationError extends Error {
      status = 401
    }
    expect(classifyAiError(new AuthenticationError('x')).errorName).toBe('AuthenticationError')
  })
})

describe('text chyby sa nikdy nedostane do výstupu', () => {
  const LEAKY =
    'messages.0.content: Ján Novák jan.novak@example.com +421 900 123 456 chce obhliadku'

  it('classifyAiError výsledok neobsahuje správu ani osobné údaje', () => {
    const out = JSON.stringify(classifyAiError(apiError(400, { message: LEAKY })))
    for (const secret of ['jan.novak@example.com', '+421', 'Novák', 'obhliadku', 'messages.0']) {
      expect(out).not.toContain(secret)
    }
  })

  it('reportAiFailure riadok neobsahuje správu ani osobné údaje', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    reportAiFailure('inbound_triage', classifyAiError(apiError(400, { message: LEAKY })), { leadId: 'lead-1' })
    const line = warn.mock.calls[0][0] as string
    warn.mockRestore()
    for (const secret of ['jan.novak@example.com', '+421', 'Novák', 'obhliadku', 'messages.0']) {
      expect(line).not.toContain(secret)
    }
  })
})

describe('reportAiFailure', () => {
  it('píše jeden JSON riadok na warn (Vercel drží len warn/error)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    reportAiFailure(
      'dashboard_insights',
      { reason: 'auth', httpStatus: 401, errorType: 'authentication_error', errorName: 'AuthenticationError', requestId: 'req_1' },
      { elapsedMs: 187 },
    )
    expect(log).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(JSON.parse(warn.mock.calls[0][0] as string)).toEqual({
      status: 'AI_CALL_FAILED',
      feature: 'dashboard_insights',
      reason: 'auth',
      http_status: 401,
      error_type: 'authentication_error',
      error_name: 'AuthenticationError',
      request_id: 'req_1',
      elapsed_ms: 187,
      after_timeout: false,
    })
    warn.mockRestore()
    log.mockRestore()
  })

  it('lead_id pridá len keď ho dostane', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const f = classifyAiError(apiError(429))
    reportAiFailure('x', f)
    reportAiFailure('x', f, { leadId: 'lead-9' })
    expect(JSON.parse(warn.mock.calls[0][0] as string)).not.toHaveProperty('lead_id')
    expect(JSON.parse(warn.mock.calls[1][0] as string).lead_id).toBe('lead-9')
    warn.mockRestore()
  })

  it('nikdy nehádže, ani keď logovanie samo zlyhá', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
      throw new Error('console rozbitá')
    })
    expect(() => reportAiFailure('x', classifyAiError(apiError(500)))).not.toThrow()
    warn.mockRestore()
  })
})
