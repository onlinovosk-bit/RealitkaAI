import type { ScrapedAgencyInput } from "@/lib/scraper/types";

export function scoreAgency(agency: Pick<ScrapedAgencyInput, "listings">): number {
  let score = 0;
  const n = agency.listings ?? 0;

  if (n > 50) score += 50;
  else if (n > 30) score += 40;
  else if (n > 20) score += 30;
  else if (n > 10) score += 15;

  if (n > 0) score += Math.min(20, Math.floor(n / 10));

  return Math.min(100, score);
}
