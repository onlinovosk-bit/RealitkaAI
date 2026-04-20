export function forecastRevenue(leads: { score: number; budget: number }[]): number {
  return leads.reduce((sum, l) => sum + l.budget * (l.score / 100), 0);
}
