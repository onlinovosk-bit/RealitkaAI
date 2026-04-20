export function computeConfidence(dataPoints: number): number {
  if (dataPoints <= 0) return 0.3;
  if (dataPoints >= 10) return 0.95;
  return 0.3 + (dataPoints / 10) * 0.65;
}
