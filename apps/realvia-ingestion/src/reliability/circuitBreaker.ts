type CircuitState = 'closed' | 'open' | 'half-open'

interface CircuitBreakerOptions {
  threshold?: number          // consecutive failures before opening
  halfOpenAfterMs?: number    // how long to wait before trying half-open
  onOpen?: (failures: number) => void
  onClose?: () => void
}

export class CircuitBreaker {
  private state: CircuitState = 'closed'
  private failures = 0
  private openedAt: number | null = null
  private readonly threshold: number
  private readonly halfOpenAfterMs: number
  private readonly onOpen?: (failures: number) => void
  private readonly onClose?: () => void

  constructor(opts: CircuitBreakerOptions = {}) {
    this.threshold      = opts.threshold      ?? parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD ?? '10', 10)
    this.halfOpenAfterMs = opts.halfOpenAfterMs ?? 5 * 60 * 1000  // 5 minutes
    this.onOpen  = opts.onOpen
    this.onClose = opts.onClose
  }

  get isOpen(): boolean {
    if (this.state === 'open') {
      const elapsed = Date.now() - (this.openedAt ?? 0)
      if (elapsed >= this.halfOpenAfterMs) {
        this.state = 'half-open'
        console.log('[circuit] half-open — allowing one probe request')
        return false
      }
      return true
    }
    return false
  }

  recordSuccess(): void {
    if (this.state === 'half-open') {
      console.log('[circuit] probe succeeded — circuit closed')
      this.onClose?.()
    }
    this.failures = 0
    this.state = 'closed'
    this.openedAt = null
  }

  recordFailure(): void {
    this.failures++
    if (this.state === 'half-open') {
      console.error('[circuit] probe failed — circuit remains open')
      this.state = 'open'
      this.openedAt = Date.now()
      return
    }
    if (this.state === 'closed' && this.failures >= this.threshold) {
      this.state = 'open'
      this.openedAt = Date.now()
      console.error(`[circuit] OPEN after ${this.failures} consecutive failures`)
      this.onOpen?.(this.failures)
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen) {
      throw new Error(`Circuit breaker is OPEN (${this.failures} consecutive failures). Next probe in ${Math.ceil((this.halfOpenAfterMs - (Date.now() - (this.openedAt ?? 0))) / 1000)}s.`)
    }
    try {
      const result = await fn()
      this.recordSuccess()
      return result
    } catch (err) {
      this.recordFailure()
      throw err
    }
  }

  getStatus(): { state: CircuitState; failures: number } {
    return { state: this.state, failures: this.failures }
  }
}
