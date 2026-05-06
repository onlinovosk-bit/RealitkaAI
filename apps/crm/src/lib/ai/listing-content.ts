/**
 * KF1 — Listing Content Generator
 * Vstup: surové dáta nehnuteľnosti → Výstup: portal text, FB, IG, email, SEO
 * Toto je prvá AI feature viditeľná priamo maklérom.
 */

import { getClaudeClient, CLAUDE_SONNET, extractJson } from "./claude";

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

export interface ListingContent {
  portal_text:  string;
  fb_ad_copy:   string;
  ig_caption:   string;
  email_subject: string;
  email_body:   string;
  seo_keywords: string[];
}

// Cache system prompt — platí pre každé volanie s rovnakým agentom.
const SYSTEM_PROMPT = `Si senior copywriter pre slovenský realitný trh s 15 rokmi skúseností. \
Píšeš texty čo skutočne predávajú — konkrétne, emocionálne, bez generických klišé. \
NIKDY nepoužívaj: "krásny byt", "ideálna poloha", "výnimočná príležitosť", "moderný", "priestranný". \
Namiesto toho: fakty, čísla, konkrétne výhody, silné otváracie vety. \
Výstup je VŽDY validný JSON bez komentárov a markdown.`;

const PERSONA_CONTEXT: Record<ListingPersona, string> = {
  INVESTOR: "Cieľ: investor hľadajúci výnos. Zdôrazni: výnos z prenájmu (%), lokalitu, dopyty v okolí, potenciál rastu ceny, rýchlosť predaja.",
  FAMILY:   "Cieľ: rodina s deťmi. Zdôrazni: bezpečnosť, školy a škôlky v pešej dostupnosti, priestor na hranie, tiché susedstvo, záhrada/balkón.",
  DOWNSIZER:"Cieľ: ľudia zmenšujúci bývanie (50+). Zdôrazni: nízka údržba, výťah/bezbariérovosť, blízkosť lekárne a prírody, pohodlie.",
  GENERAL:  "Cieľ: všeobecný kupujúci. Vyvážený text, zdôrazni hlavné silné stránky.",
};

export async function generateListingContent(
  property: PropertyInput,
  persona: ListingPersona = "GENERAL"
): Promise<ListingContent> {
  const client = getClaudeClient();

  const priceFormatted = property.price.toLocaleString("sk-SK");
  const floorInfo = property.floor != null
    ? `${property.floor}. poschodie z ${property.total_floors ?? "?"}`
    : "neuvedené";

  const userPrompt = `NEHNUTEĽNOSŤ NA PREDAJ:
Typ: ${property.type}
Lokalita: ${property.location}${property.district ? `, ${property.district}` : ""}
Výmera: ${property.size_m2} m²  |  Izby: ${property.rooms ?? "neuvedené"}
Podlažie: ${floorInfo}
Cena: ${priceFormatted} €  (${Math.round(property.price / property.size_m2).toLocaleString("sk-SK")} €/m²)
Stav: ${property.condition}
Vybavenie: ${property.features.join(", ")}
${property.agent_notes ? `Poznámky makléra: ${property.agent_notes}` : ""}

Stratégia pre kupujúceho: ${PERSONA_CONTEXT[persona]}

Vygeneruj JSON:
{
  "portal_text": "Text pre nehnutelnosti.sk a topreality.sk — 260-320 slov. Prvá veta musí byť háčik. Konkrétne výhody, nie prídavné mená. Zakončiť silnou CTA.",
  "fb_ad_copy": "Facebook/Instagram reklama — 65-80 slov. Hook, benefit, urgencia (napr. počet záujemcov/obmedzená ponuka), CTA tlačidlo text.",
  "ig_caption": "Instagram caption — 2 krátke odstavce + 7 relevantných hashtagov v slovenčine.",
  "email_subject": "Predmet emailu — max 52 znakov, bez emoji, zvedavosť + konkrétum.",
  "email_body": "Telo emailu pre databázu klientov — 160-200 slov. Osobný tón, hlavné výhody, jasný ďalší krok.",
  "seo_keywords": ["6 kľúčových slov pre portálové vyhľadávanie, konkrétne a hľadané"]
}`;

  const response = await client.messages.create({
    model: CLAUDE_SONNET,
    max_tokens: 2200,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
  return extractJson<ListingContent>(raw);
}
