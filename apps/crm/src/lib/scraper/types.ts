export type ScrapedAgencyInput = {
  name: string;
  city: string;
  listings: number;
  sourceUrl?: string;
  source?: string;
};

export type ScrapedAgencyRow = ScrapedAgencyInput & {
  id: string;
  score: number;
  scrapedAt: string;
  externalKey: string;
};
