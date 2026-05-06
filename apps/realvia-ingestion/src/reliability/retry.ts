interface RetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  onRetry?: (attempt: number, error: Error, delayMs: number) => void
}

function jitter(ms: number): number {
  return ms + Math.floor(Math.random() * ms * 0.3)
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? parseInt(process.env.MAX_RETRY_ATTEMPTS ?? '5', 10)
  const baseDelay   = opts.baseDelayMs ?? 2_000
  const maxDelay    = opts.maxDelayMs  ?? 60_000

  let lastError: Error = new Error('Unknown error')

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      if (attempt === maxAttempts) break

      const exponential = baseDelay * Math.pow(2, attempt - 1)
      const delay = jitter(Math.min(exponential, maxDelay))

      opts.onRetry?.(attempt, lastError, delay)
      console.warn(`[retry] attempt ${attempt}/${maxAttempts} failed: ${lastError.message} — retrying in ${delay}ms`)

      await new Promise<void>((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}
