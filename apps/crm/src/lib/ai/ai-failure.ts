/**
 * AI-FAIL-VISIBLE — zlyhanie volania na LLM musí po sebe zanechať čitateľnú stopu.
 *
 * Prečo to vzniklo: `withAiTimeout` dlho robil `promise.catch(() => fallback)` bez logu,
 * takže odmietnuté volanie (401, kredit, 429…) vyzeralo ako obyčajná deterministická
 * záloha. Od 2026-09-22 nedostal žiadny nový lead AI triage ani návrh odpovede a nedalo
 * sa zistiť prečo: Vercel drží len `warn`/`error` ~1 h a chyba sa nikde neuložila.
 *
 * Tento modul je čistý (žiadny I/O ani serverový import) — dá sa použiť kdekoľvek.
 *
 * Pravidlo: NIKDY nelogujeme text chyby. Správa API môže obsahovať kus vstupu (meno,
 * e-mail, telefón z leadu). Zo správy sa použije len to, že sa na nejaký vzor zhoduje
 * (kredit/billing, chýbajúci kľúč); do výstupu ide iba kód dôvodu, HTTP status, typ
 * chyby z tela odpovede, názov triedy chyby a request-id.
 */

export type AiFailureReason =
  /** Naše vlastné časové okno vypršalo skôr, než model odpovedal. */
  | 'timeout'
  /** Chýba konfigurácia (napr. `ANTHROPIC_API_KEY`). */
  | 'config'
  /** 401/403 — neplatný alebo odvolaný kľúč, chýbajúce oprávnenie. */
  | 'auth'
  /** 402 alebo správa o kredite/platbe — účet nemá prostriedky. */
  | 'billing'
  | 'rate_limit'
  /** 529 — služba je preťažená. */
  | 'overloaded'
  /** Ostatné 5xx. */
  | 'server_error'
  | 'not_found'
  /** 400/409/413/422 — požiadavka je zlá (nie kredit). */
  | 'invalid_request'
  /** Spojenie sa nenadviazalo alebo sa prerušilo (bez HTTP odpovede). */
  | 'network'
  /** Model odpovedal, ale výstup sa nedal spracovať. */
  | 'bad_output'
  | 'unknown'

export interface AiFailure {
  reason: AiFailureReason
  httpStatus: number | null
  /** `error.type` z tela odpovede API, napr. `rate_limit_error`. */
  errorType: string | null
  /** Názov triedy chyby (v minifikovanom builde môže byť skrátený). */
  errorName: string | null
  requestId: string | null
}

const BILLING_MESSAGE = /credit balance|billing|payment required|insufficient (funds|credit)|out of credit/i
const NETWORK_MESSAGE = /fetch failed|ECONNRESET|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|socket hang up|connection error/i

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

function asRecord(v: unknown): Record<string, unknown> {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {}
}

/** `error.type` z tela odpovede — SDK ho dáva do `type`, tvar tela je `{ error: { type } }`. */
function bodyErrorType(body: unknown): string | null {
  const b = asRecord(body)
  return asString(asRecord(b.error).type) ?? asString(b.type)
}

function headerRequestId(headers: unknown): string | null {
  const h = headers as { get?: (k: string) => string | null } | undefined
  if (h && typeof h.get === 'function') {
    try {
      return asString(h.get('request-id'))
    } catch {
      return null
    }
  }
  return null
}

export function classifyAiError(err: unknown): AiFailure {
  const e = asRecord(err)
  const status = typeof e.status === 'number' ? e.status : null
  const message = typeof e.message === 'string' ? e.message : ''
  const errorType = asString(e.type) ?? bodyErrorType(e.error)
  const requestId = asString(e.requestID) ?? asString(e.request_id) ?? headerRequestId(e.headers)
  const errorName =
    asString((err as { constructor?: { name?: unknown } } | null)?.constructor?.name) ?? asString(e.name)

  const base = { httpStatus: status, errorType, errorName, requestId }
  const is = (reason: AiFailureReason): AiFailure => ({ reason, ...base })

  if (status === null && /ANTHROPIC_API_KEY|OPENAI_API_KEY/.test(message)) return is('config')

  if (status === 402 || errorType === 'billing_error') return is('billing')
  if (status !== null && status >= 400 && status < 500 && BILLING_MESSAGE.test(message)) return is('billing')

  if (status === 401 || status === 403) return is('auth')
  if (status === 404) return is('not_found')
  if (status === 429) return is('rate_limit')
  if (status === 529) return is('overloaded')
  if (status !== null && status >= 500) return is('server_error')
  if (status !== null && status >= 400) return is('invalid_request')

  // Bez HTTP statusu: spojenie, alebo chyba spracovania na našej strane.
  const name = errorName ?? ''
  if (/Connection|Timeout|Abort/i.test(name) || NETWORK_MESSAGE.test(message)) return is('network')
  if (err instanceof SyntaxError || message.startsWith('AI returned invalid JSON')) return is('bad_output')

  return is('unknown')
}

export interface AiFailureContext {
  elapsedMs?: number
  /** Chyba prišla až po tom, čo vypršalo naše časové okno — odhaľuje skutočnú príčinu pomalého zlyhania. */
  afterTimeout?: boolean
  leadId?: string
}

/**
 * Jeden JSON riadok na `warn`. Vercel na tomto pláne drží len `warn`/`error`, takže
 * `console.log` by po odpovedi requestu zmizol úplne (viď poznámka v reply-draft.ts).
 */
export function reportAiFailure(feature: string, failure: AiFailure, ctx: AiFailureContext = {}): void {
  try {
    console.warn(
      JSON.stringify({
        status: 'AI_CALL_FAILED',
        feature,
        reason: failure.reason,
        http_status: failure.httpStatus,
        error_type: failure.errorType,
        error_name: failure.errorName,
        request_id: failure.requestId,
        elapsed_ms: ctx.elapsedMs ?? null,
        after_timeout: ctx.afterTimeout ?? false,
        ...(ctx.leadId ? { lead_id: ctx.leadId } : {}),
      }),
    )
  } catch {
    // Logovanie nesmie nikdy zhodiť volajúceho.
  }
}
