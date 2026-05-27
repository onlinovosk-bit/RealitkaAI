import type { StealthProspectUpsertInput } from "./store";

/** QA-only seed data — never used in production unless STEALTH_RECRUITER_DEMO=1 */
export const DEMO_STEALTH_PROSPECTS: StealthProspectUpsertInput[] = [
  {
    address: "Sabinovská 18, Prešov",
    source: "bazos",
    score: 91,
    status: "identified",
    metadata: {
      platform: "bazos",
      daysListed: 87,
      originalPrice: 145000,
      currentPrice: 128000,
      priceDropPercent: 11.7,
      demoId: "sr_1",
    },
  },
  {
    address: "Levočská 4, Prešov",
    source: "nehnutelnosti",
    score: 88,
    status: "identified",
    metadata: {
      platform: "nehnutelnosti",
      daysListed: 134,
      originalPrice: 89000,
      currentPrice: 79500,
      priceDropPercent: 10.7,
      demoId: "sr_2",
    },
  },
  {
    address: "Metodova 7, Košice",
    source: "bazos",
    score: 95,
    status: "identified",
    metadata: {
      platform: "bazos",
      daysListed: 212,
      originalPrice: 175000,
      currentPrice: 149000,
      priceDropPercent: 14.9,
      demoId: "sr_3",
    },
  },
  {
    address: "Nálepkova 33, Prešov",
    source: "reality",
    score: 64,
    status: "identified",
    metadata: {
      platform: "reality",
      daysListed: 56,
      originalPrice: 112000,
      currentPrice: 108000,
      priceDropPercent: 3.6,
      demoId: "sr_4",
    },
  },
  {
    address: "Tatranská 9, Poprad",
    source: "facebook",
    score: 89,
    status: "identified",
    metadata: {
      platform: "facebook",
      daysListed: 168,
      originalPrice: 98000,
      currentPrice: 85000,
      priceDropPercent: 13.3,
      demoId: "sr_5",
    },
  },
];

export function isStealthRecruiterDemoMode(): boolean {
  return process.env.STEALTH_RECRUITER_DEMO === "1";
}
