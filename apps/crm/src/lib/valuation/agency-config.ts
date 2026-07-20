import { SMOLKO_AGENCY_ID } from "@/lib/profiles/resolve-profile-for-auth";

export type ValuationAgencyConfig = {
  slug: string;
  agencyId: string;
  displayName: string;
  headline: string;
  subhead: string;
  contactPromise: string;
  privacyUrl: string;
};

const AGENCIES: Record<string, ValuationAgencyConfig> = {
  "reality-smolko": {
    slug: "reality-smolko",
    agencyId: SMOLKO_AGENCY_ID,
    displayName: "Reality Smolko, s. r. o.",
    headline: "Orientačný odhad nehnuteľnosti zadarmo",
    subhead:
      "Vyplňte údaje o nehnuteľnosti — maklér vás kontaktuje s orientačným odhadom a ďalšími krokmi.",
    contactPromise: "Ozveme sa vám v pracovnom čase — zvyčajne do 2 hodín.",
    privacyUrl: "https://www.realitysmolko.sk/ochrana-osobnych-udajov",
  },
};

export function getValuationAgency(slug: string): ValuationAgencyConfig | null {
  const key = slug.trim().toLowerCase();
  return AGENCIES[key] ?? null;
}

export function listValuationAgencySlugs(): string[] {
  return Object.keys(AGENCIES);
}
