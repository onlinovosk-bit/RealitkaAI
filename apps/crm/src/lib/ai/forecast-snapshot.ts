export type ForecastSnapshot = {
  period: string;
  expectedRevenue: number;
  leadsCount: number;
  avgScore: number;
  generatedAt: string;
};
export function buildForecastSnapshot(
  period: string,
  leads: { score: number; budget: number }[]
): ForecastSnapshot {
  const n = leads.length;
  const rev = leads.reduce((s, l) => s + l.budget * (l.score / 100), 0);
  const avg = n > 0 ? leads.reduce((s, l) => s + l.score, 0) / n : 0;
  return { period, expectedRevenue: rev, leadsCount: n, avgScore: avg, generatedAt: new Date().toISOString() };
}
