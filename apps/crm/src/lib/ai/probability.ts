/**
 * Jednoduchý model pravdepodobnosti uzavretia podľa skóre (0–1).
 */
export function getDealProbability(score: number): number {
  if (score > 80) return 0.7;
  if (score > 60) return 0.4;
  if (score > 40) return 0.2;
  return 0.05;
}
