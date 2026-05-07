/**
 * KF4 — Real Sales Brain
 * Predtým: if score >= 75 return "Horúci lead" (hardcoded vždy)
 * Teraz: Claude analyzuje kompletné dáta leadu a generuje konkrétny insight.
 *
 * Existujúce volania analyzeSalesBrain() fungujú bez zmien.
 */

import { getClaudeClient, CLAUDE_HAIKU, extractJson } from "./claude";

export type SalesBrainInsight = {
  headline:        string;                        // max 6 slov
  reasoning:       string;                        // 1 veta prečo — "Why this recommendation?" (Wang)
  confidence:      "high" | "medium" | "low";    // AI istota — zobrazuj v UI (Cherny)
  data_points:     string[];                      // 3 konkrétne dátové body z ktorých AI vychádzala (tooltip)
  priority:        "high" | "medium" | "low";
  suggestedAction: string;                        // 1 veta, imperatív
};

const SYSTEM = `Si AI realitný asistent pre slovenský trh. \
Dostaneš dáta o leade a vrátiš stručnú akčnú analýzu. \
Buď konkrétny — nie generický. Výstup je VŽDY JSON bez markdown.`;

export async function analyzeSalesBrain(
  _leadId: string,
  data: Record<string, unknown>
): Promise<SalesBrainInsight> {
  const client = getClaudeClient();

  // Filtrovanie citlivých polí pred poslaním do Claude
  const safeData = {
    status: data.status,
    score: data.score,
    bri_score: data.bri_score,
    budget: data.budget,
    location: data.location,
    property_type: data.property_type,
    rooms: data.rooms,
    last_contact_at: data.last_contact_at,
    created_at: data.created_at,
    financing: data.financing,
    timeline: data.timeline,
  };

  const response = await client.messages.create({
    model: CLAUDE_HAIKU,
    max_tokens: 250,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: `Lead dáta: ${JSON.stringify(safeData, null, 2)}

Vráť JSON:
{
  "headline": "Stručný popis situácie — max 6 slov",
  "reasoning": "Prečo táto priorita — 1 veta s konkrétnym dôvodom z dát",
  "confidence": "high|medium|low — ako istý si touto analýzou na základe dostupných dát",
  "data_points": ["3 konkrétne fakty z dát ktoré rozhodli (napr. 'Financovanie: schválené', '4 dni bez kontaktu', 'BRI skóre 87/100')"],
  "priority": "high|medium|low",
  "suggestedAction": "Čo má maklér urobiť TERAZ — 1 veta, imperatív, max 12 slov"
}`,
      },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  try {
    return extractJson<SalesBrainInsight>(raw);
  } catch {
    const s = typeof data.score === "number" ? data.score : 50;
    return {
      headline:        s >= 75 ? "Horúci lead — konaj" : "Lead potrebuje kontakt",
      reasoning:       `Skóre ${s}/100 — automatický fallback, AI nedostupná`,
      confidence:      "low" as const,
      data_points:     [`Skóre: ${s}/100`, "AI analýza nedostupná", "Skontroluj manuálne"],
      priority:        s >= 75 ? "high" : s >= 45 ? "medium" : "low",
      suggestedAction: s >= 75 ? "Zavolaj dnes, nie zajtra." : "Pošli stručnú správu so zaujímavosťou.",
    };
  }
}
