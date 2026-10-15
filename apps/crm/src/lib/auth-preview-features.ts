import { AI_ASSISTANT_NAME } from "@/lib/ai-brand";

/**
 * Login right-hand preview — only features that exist in CRM code + marketing.
 * Listing Reel is omitted: no matching module in apps/crm or apps/marketing.
 */
export type AuthPreviewFeature = {
  id: string;
  title: string;
  outcome: string;
  source: string;
};

export const AUTH_PREVIEW_TILES: readonly AuthPreviewFeature[] = [
  {
    id: "listing-content",
    title: "Generátor inzerátu",
    outcome: "Texty na portál, Facebook, Instagram a e-mail",
    source: "src/app/(dashboard)/inzerat-generator/page.tsx",
  },
  {
    id: "lead-triage",
    title: "Horúce dopyty",
    outcome: "Priorita podľa triáže, nie podľa poslednej správy",
    source: "src/lib/ai/lead-triage-batch.ts",
  },
] as const;

export const AUTH_PREVIEW_PULSE: readonly AuthPreviewFeature[] = [
  {
    id: "inbound-draft",
    title: AI_ASSISTANT_NAME,
    outcome: `${AI_ASSISTANT_NAME}: návrh odpovede na nový dopyt — čaká na vaše schválenie.`,
    source: "src/lib/inbound/process-lead.ts",
  },
  {
    id: "morning-brief",
    title: "Ranný brief",
    outcome: "Ranný brief: ráno vidíte, komu volať a prečo.",
    source: "src/lib/morning-brief/assemble.ts",
  },
  {
    id: "call-coach",
    title: "Analyzátor hovorov",
    outcome: "Analyzátor hovorov: spätná väzba z prepisu a ďalší krok.",
    source: "src/app/(dashboard)/call-analyzer/page.tsx",
  },
  {
    id: "valuation",
    title: "Odhad ceny",
    outcome: "Odhad ceny: orientačný odhad nehnuteľnosti pre záujemcu.",
    source: "src/app/(marketing)/odhad/[agencySlug]/page.tsx",
  },
] as const;
