/**
 * KF1 — Listing Content Generator
 * Vstup: surové dáta nehnuteľnosti → Výstup: portal text, FB, IG, email, SEO
 * Toto je prvá AI feature viditeľná priamo maklérom.
 */

import { callClaude, CLAUDE_SONNET, extractJson } from "./claude";
import { estimateClaudeCostEur } from "./llm-usage-cost";
import { SYSTEM_PROMPT } from "./listing-content-system-prompt";

export { SYSTEM_PROMPT };

/**
 * E1 — optional locality character (brief + FINAL).
 * Without this field the model must not invent „povaha lokality“.
 * Enum labels are Slovak (prompt + UI); free text supplements any kind.
 */
export const CHARAKTER_LOKALITY_KINDS = [
  "malé mesto",
  "sídlisko",
  "vidiek",
  "centrum",
  "satelit",
  "iné",
] as const;

export type CharakterLokalityKind = (typeof CHARAKTER_LOKALITY_KINDS)[number];

export type CharakterLokalityInput = {
  kind?: CharakterLokalityKind;
  /** Soft municipal / local nuance (e.g. „Sabinov nie je Prešov“) */
  text?: string;
};

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
  /** E1: only source for locality character / soft municipal tone */
  charakterLokality?: CharakterLokalityInput;
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

/** E1: one prompt line, or null when empty (no locality-character sentence allowed). */
export function formatCharakterLokalityLine(
  value: CharakterLokalityInput | undefined,
): string | null {
  if (!value) return null;
  const kind = value.kind?.trim() ?? "";
  const text = value.text?.trim() ?? "";
  if (!kind && !text) return null;
  if (kind && text) return `Charakter lokality (E1): ${kind} — ${text}`;
  if (kind) return `Charakter lokality (E1): ${kind}`;
  return `Charakter lokality (E1): ${text}`;
}

/** Drop empty charakterLokality before API / persistence (optional field). */
export function sanitizePropertyInput(property: PropertyInput): PropertyInput {
  const line = formatCharakterLokalityLine(property.charakterLokality);
  if (line) {
    const kind = property.charakterLokality?.kind?.trim() as CharakterLokalityKind | undefined;
    const text = property.charakterLokality?.text?.trim();
    return {
      ...property,
      charakterLokality: {
        ...(kind ? { kind } : {}),
        ...(text ? { text } : {}),
      },
    };
  }
  if (!("charakterLokality" in property)) return property;
  const { charakterLokality: _omit, ...rest } = property;
  return rest;
}

export function buildListingUserPrompt(property: PropertyInput, persona: ListingPersona = "GENERAL"): string {
  const priceFormatted = property.price.toLocaleString("sk-SK");
  const floorInfo = property.floor != null
    ? `${property.floor}. poschodie z ${property.total_floors ?? "?"}`
    : "neuvedené";
  const pricePerM2 = property.size_m2 > 0
    ? `${Math.round(property.price / property.size_m2).toLocaleString("sk-SK")} €/m²`
    : "neuvedené";
  const charakterLine = formatCharakterLokalityLine(property.charakterLokality);
  return `NEHNUTEĽNOSŤ NA PREDAJ:
Typ: ${property.type}
Lokalita: ${property.location}${property.district ? `, ${property.district}` : ""}
${charakterLine ? `${charakterLine}\n` : ""}Výmera: ${property.size_m2} m²  |  Izby: ${property.rooms ?? "neuvedené"}
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
  const userPrompt = buildListingUserPrompt(sanitizePropertyInput(property), persona);
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
