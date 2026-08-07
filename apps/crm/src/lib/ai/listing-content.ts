/**
 * KF1 — Listing Content Generator
 * Vstup: surové dáta nehnuteľnosti → Výstup: portal text, FB, IG, email, SEO
 * Toto je prvá AI feature viditeľná priamo maklérom.
 */

import { callClaude, CLAUDE_SONNET, extractJson } from "./claude";
import { estimateClaudeCostEur } from "./llm-usage-cost";
import { SYSTEM_PROMPT } from "./listing-content-system-prompt";

export { SYSTEM_PROMPT };

export interface PropertyInput {
  type: string;           // "3-izbový byt", "rodinný dom", ...
  location: string;       // "Bratislava"
  district?: string;      // "Ružinov"
  size_m2: number;
  floor?: number;
  total_floors?: number;
  price: number;          // EUR
  rooms?: string;         // "3+1"
  condition: string;      // "novostavba" | "po rekonštrukcii" | "pôvodný stav"
  features: string[];     // ["balkón", "parking", "pivnica"]
  agent_notes?: string;   // Surové poznámky makléra
}

export type ListingPersona = "INVESTOR" | "FAMILY" | "DOWNSIZER" | "GENERAL";

/**
 * KF1 listing output — required keys match `generateListingContent` JSON.
 * Optional fields (C4 / FINAL prompt) are additive: no mapper, same keys as prompt.
 * - titles: 3 portal/social/alt title variants (K5 titles[])
 * - missingData / recommendations / techniquesUsed: maklér-facing meta (not client copy)
 */
export interface ListingContent {
  portal_text:  string;
  fb_ad_copy:   string;
  ig_caption:   string;
  email_subject: string;
  email_body:   string;
  seo_keywords: string[];
  /** Optional: 3 title variants — [0] portals, [1] social, [2] alt angle */
  titles?: string[];
  /** Optional: missing facts that would strengthen copy ([DOPLNIŤ] mirror) */
  missingData?: string[];
  /** Optional: maklér tips (process / vocabulary / form fields) */
  recommendations?: string[];
  /** Optional: technique IDs 1–10 actually visible in client-facing copy */
  techniquesUsed?: number[];
}

export const PERSONA_CONTEXT: Record<ListingPersona, string> = {
  INVESTOR: "Cieľ: investor hľadajúci výnos. Zdôrazni: lokalitu, dopyt v okolí, potenciál rastu ceny, rýchlosť predaja — bez sľubu investičného výnosu/rentability.",
  FAMILY:   "Cieľ: rodina s deťmi. Zdôrazni: bezpečnosť, školy a škôlky v pešej dostupnosti (len ak vo vstupe), priestor na hranie, tiché susedstvo, záhrada/balkón — len fakty zo vstupu.",
  DOWNSIZER:"Cieľ: ľudia zmenšujúci bývanie (50+). Zdôrazni: nízka údržba, výťah/bezbariérovosť, blízkosť lekárne a prírody, pohodlie — len fakty zo vstupu.",
  GENERAL:  "Cieľ: všeobecný kupujúci. Vyvážený text, zdôrazni hlavné silné stránky zo vstupu.",
};

export function buildListingUserPrompt(property: PropertyInput, persona: ListingPersona = "GENERAL"): string {
  const priceFormatted = property.price.toLocaleString("sk-SK");
  const floorInfo = property.floor != null
    ? `${property.floor}. poschodie z ${property.total_floors ?? "?"}`
    : "neuvedené";
  const pricePerM2 = property.size_m2 > 0
    ? `${Math.round(property.price / property.size_m2).toLocaleString("sk-SK")} €/m²`
    : "neuvedené";
  return `NEHNUTEĽNOSŤ NA PREDAJ:
Typ: ${property.type}
Lokalita: ${property.location}${property.district ? `, ${property.district}` : ""}
Výmera: ${property.size_m2} m²  |  Izby: ${property.rooms ?? "neuvedené"}
Podlažie: ${floorInfo}
Cena: ${priceFormatted} €  (${pricePerM2})
Stav: ${property.condition}
Vybavenie: ${property.features.join(", ") || "neuvedené"}
${property.agent_notes ? `Poznámky makléra: ${property.agent_notes.slice(0, 5_000)}` : ""}

Stratégia pre kupujúceho: ${PERSONA_CONTEXT[persona]}

Vygeneruj IBA validný JSON podľa systémových pravidiel (produkčný ListingContent):
povinné: portal_text, fb_ad_copy, ig_caption, email_subject, email_body, seo_keywords (6);
voliteľné (vyplň ak vieš): titles (3), missingData, recommendations, techniquesUsed.
Žiadny markdown, žiadny komentár okolo JSON.`;
}

export type ListingContentAudit = {
  model: string;
  costEur: number;
  latencyMs: number;
};

export async function generateListingContent(
  property: PropertyInput,
  persona: ListingPersona = "GENERAL",
): Promise<{ content: ListingContent; audit: ListingContentAudit }> {
  const userPrompt = buildListingUserPrompt(property, persona);
  const t0 = Date.now();

  const response = await callClaude({
    model: CLAUDE_SONNET,
    max_tokens: 4096,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userPrompt }],
  }, "listing-content");

  const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
  return {
    content: extractJson<ListingContent>(raw),
    audit: {
      model: CLAUDE_SONNET,
      costEur: estimateClaudeCostEur(CLAUDE_SONNET, response.usage.input_tokens, response.usage.output_tokens),
      latencyMs: Date.now() - t0,
    },
  };
}
