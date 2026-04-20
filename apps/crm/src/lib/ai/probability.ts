export function computeProbability(score: number): number {
  return Math.min(1, Math.max(0, score / 100));
}
