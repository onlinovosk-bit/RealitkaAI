import { SMOLKO_AGENCY_ID } from "@/lib/profiles/resolve-profile-for-auth";

/** Set in Vercel when AA Reality Košice tenant is provisioned in `agencies`. */
export const AA_REALITY_KOSICE_AGENCY_ID =
  process.env.VALUATION_AA_REALITY_KOSICE_AGENCY_ID?.trim() ?? "";

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
  "aa-reality-kosice": {
    slug: "aa-reality-kosice",
    agencyId: AA_REALITY_KOSICE_AGENCY_ID,
    displayName: "AA REALITY Košice s.r.o.",
    headline: "Orientačný odhad nehnuteľnosti zadarmo",
    subhead:
      "Vyplňte údaje o nehnuteľnosti — maklér vás kontaktuje s orientačným odhadom a ďalšími krokmi.",
    contactPromise: "Ozveme sa vám v pracovnom čase — zvyčajne do 2 hodín.",
    privacyUrl:
      "https://www.aarealitykosice.sk/sk/o-spolocnosti/ochrana-osobnych-udajov",
  },
};

export function getValuationAgency(slug: string): ValuationAgencyConfig | null {
  const key = slug.trim().toLowerCase();
  return AGENCIES[key] ?? null;
}

export function listValuationAgencySlugs(): string[] {
  return Object.keys(AGENCIES);
}
