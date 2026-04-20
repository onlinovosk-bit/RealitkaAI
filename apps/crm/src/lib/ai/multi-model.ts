export type ModelResult = { model: string; score: number; confidence: number };
export function mergeModelResults(r: ModelResult[]): { score: number; confidence: number } {
  if (!r.length) return { score: 50, confidence: 0.5 };
  const tc = r.reduce((s, x) => s + x.confidence, 0);
  return { score: r.reduce((s, x) => s + x.score * x.confidence, 0) / tc, confidence: tc / r.length };
}
