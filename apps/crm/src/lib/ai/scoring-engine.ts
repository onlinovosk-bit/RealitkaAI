import { getWeights } from "./weights";

/**
 * Vypočíta skóre 0–100 z normalizovaných signálov (0–1 alebo počítadlá).
 * Váhy berie z WEIGHTS (auto-tune ich upravuje).
 */
export function calculateLeadScore(signals: Record<string, number>): number {
  const w = getWeights();
  let sum = 0;
  let maxPossible = 0;

  for (const [key, raw] of Object.entries(signals)) {
    const weight = w[key] ?? 0.5;
    const v = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
    /** Signál môže byť 0–1 alebo počet; kľudne clamp. */
    const normalized = Math.min(1, Math.max(0, v > 1 ? Math.min(1, v / 10) : v));
    sum += weight * normalized;
    maxPossible += weight;
  }

  if (maxPossible <= 0) return 0;
  const pct = (sum / maxPossible) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}
