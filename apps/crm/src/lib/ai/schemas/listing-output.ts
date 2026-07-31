import { z } from "zod";

/** SSOT — verzia výstupnej schémy (ukladaj do DB). */
export const LISTING_OUTPUT_SCHEMA_VERSION = "listing_output_v1";

const qualityScoreSchema = z.object({
  overall: z.number().int().min(0).max(100),
  completeness: z.number().int().min(0).max(100),
  credibility: z.number().int().min(0).max(100),
  marketing: z.number().int().min(0).max(100),
  seo: z.number().int().min(0).max(100),
});

export const ListingOutputSchema = z.object({
  headline_variants: z.array(z.string()).length(3),
  portal_description: z.string(),
  social_description: z.string(),
  missing_information: z.array(z.string()),
  buyer_personas: z.array(
    z.object({
      group: z.string(),
      reason: z.string(),
    }),
  ),
  objection_handling: z.array(
    z.object({
      weakness: z.string(),
      customer_objection: z.string(),
      response: z.string(),
      reframing: z.string(),
    }),
  ),
  seo_keywords: z.array(z.string()),
  quality_score: qualityScoreSchema,
  cta: z.string(),
});

export type ListingOutput = z.infer<typeof ListingOutputSchema>;

/** Popis schémy pre AI prompt — generovaný z SSOT, nie duplikovaný. */
export function listingOutputSchemaPromptRef(): string {
  return [
    "Vráť validný JSON podľa ListingOutputSchema:",
    "- headline_variants: presne 3 titulky (portálový keyword, emotívny, cena/m²)",
    "- portal_description: 250–400 slov",
    "- social_description: max 500 znakov pre FB/IG",
    "- missing_information: čo chýba na vstupe",
    "- buyer_personas: 2–4 skupiny { group, reason }",
    "- objection_handling: slabiny → { weakness, customer_objection, response, reframing }",
    "- seo_keywords: kľúčové slová",
    `- quality_score: { overall, completeness, credibility, marketing, seo } každé 0–100`,
    "- cta: konkrétna výzva (meno/telefón ak sú na vstupe)",
  ].join("\n");
}

export function parseListingOutput(raw: unknown): ListingOutput {
  return ListingOutputSchema.parse(raw);
}
