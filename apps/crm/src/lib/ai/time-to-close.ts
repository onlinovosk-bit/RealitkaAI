export function estimateTimeToCloseDays(score: number): number {
  if (score >= 80) return 14;
  if (score >= 60) return 30;
  if (score >= 40) return 60;
  return 90;
}
