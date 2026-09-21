/**
 * Daily execution ceiling for the always-on runner.
 *
 * Every individual capability may be harmless, but a runaway queue must not buy
 * an unbounded number of Claude invocations or GitHub operations. Founder
 * decision, 2026-09-21: a hard ceiling on *task executions*, not on turns, and
 * reaching it stops automatic execution rather than merely warning.
 */

export const DAILY_EXECUTION_CAP = 100;
export const CAP_WINDOW_MS = 24 * 60 * 60_000;

/** Timestamps still inside the rolling window, oldest first. */
export function withinWindow(stamps: readonly string[], now: Date, windowMs: number = CAP_WINDOW_MS): string[] {
  const floor = now.getTime() - windowMs;
  return stamps
    .filter((stamp) => {
      const at = Date.parse(stamp);
      // An unparseable stamp is dropped rather than counted forever: the ledger
      // is a budget, not an audit log.
      return !Number.isNaN(at) && at > floor;
    })
    .sort();
}

export interface CapState {
  /** Executions recorded inside the window. */
  used: number;
  remaining: number;
  /** When the oldest execution in the window falls out, freeing one slot. */
  resetsAt?: string;
}

export function capState(
  stamps: readonly string[],
  now: Date,
  cap: number = DAILY_EXECUTION_CAP,
  windowMs: number = CAP_WINDOW_MS,
): CapState {
  const live = withinWindow(stamps, now, windowMs);
  const oldest = live[0];
  return {
    used: live.length,
    remaining: Math.max(0, cap - live.length),
    resetsAt: oldest ? new Date(Date.parse(oldest) + windowMs).toISOString() : undefined,
  };
}

export function capReached(
  stamps: readonly string[],
  now: Date,
  cap: number = DAILY_EXECUTION_CAP,
  windowMs: number = CAP_WINDOW_MS,
): boolean {
  return capState(stamps, now, cap, windowMs).remaining === 0;
}
