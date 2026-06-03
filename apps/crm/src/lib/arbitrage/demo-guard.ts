/**
 * Arbitrage demo is never allowed in production, even if ARBITRAGE_DEMO_MODE=true.
 * In non-production, demo requires ARBITRAGE_DEMO_MODE=true.
 */
export function isArbitrageDemoAllowed(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  return process.env.ARBITRAGE_DEMO_MODE === 'true'
}
