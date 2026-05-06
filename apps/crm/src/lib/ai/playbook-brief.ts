/**
 * KF7 — Smart Daily Playbook Brief
 * Predtým: rule engine → statické texty "Zavolaj Marta (horúci lead)"
 * Teraz: Claude vezme výstup rule engine + generuje ľudský, personalizovaný brief.
 *
 * Pattern: Rule engine určí KOHO kontaktovať → Claude napíše AKO a PREČO.
 * Toto zachováva deterministickú logiku výberu leadov a pridáva AI vrstvu.
 */

import { getClaudeClient, CLAUDE_HAIKU, extractJson } from "./claude";
import type { PlaybookItemDto } from "@/services/playbook/types";

export interface EnrichedPlaybookItem extends PlaybookItemDto {
  ai_message_draft?: string;     // Konkrétny návrh správy/hovoru
  ai_why?:           string;     // Prečo práve teraz kontaktovať
  ai_risk?:          string;     // Čo sa stane ak nekontatujeme
}

export interface DailyBriefOutput {
  date:         string;          // ISO date
  agent_name?:  string;
  top_insight:  string;          // Jeden kľúčový insight pre celý deň
  items:        EnrichedPlaybookItem[];
  revenue_at_risk: string;       // Odhadovaný príjem v riziku ak sa nekoná
}

const SYSTEM = `Si AI asistent pre realitných maklérov v SR. \
Ráno pripravuješ denný brief — stručný, akčný, bez zbytočného textu. \
Každý kontakt musí mať konkrétny dôvod PREČO PRÁVE DNES. \
Výstup je VŽDY validný JSON bez markdown.`;

/**
 * Obohatí existujúce playbook items o AI vrstvu.
 * Vstupom sú PlaybookItemDto z buildPlaybook() — nijak sa nemenia, iba sa enrichujú.
 */
export async function enrichPlaybookWithClaude(
  items: PlaybookItemDto[],
  agentName?: string
): Promise<DailyBriefOutput> {
  if (!items.length) {
    return {
      date: new Date().toISOString().split("T")[0],
      agent_name: agentName,
      top_insight: "Dnes nie sú žiadne naplánované akcie.",
      items: [],
      revenue_at_risk: "0 €",
    };
  }

  const client = getClaudeClient();

  // Skomprimovaný vstup — len čo Claude potrebuje
  const compactItems = items.slice(0, 10).map((item, i) => ({
    idx: i + 1,
    lead: item.buyerName ?? "Neznámy",
    action: item.title,
    reason: item.reason,
    priority: item.priority,
    subtitle: item.subtitle,
  }));

  const response = await client.messages.create({
    model: CLAUDE_HAIKU,
    max_tokens: 1_200,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: `Dnes je ${new Date().toLocaleDateString("sk-SK", { weekday: "long", day: "numeric", month: "long" })}. \
Maklér: ${agentName ?? "neznámy"}

Dnešné akcie z playbooku:
${JSON.stringify(compactItems, null, 2)}

Vráť JSON:
{
  "top_insight": "Jeden kľúčový insight pre celý deň — čo je najdôležitejšie (1-2 vety)",
  "revenue_at_risk": "Odhadovaný príjem v riziku ak sa DNES nekoná (napr. '~18 000 €')",
  "enriched_items": [
    {
      "idx": 1,
      "ai_message_draft": "Konkrétna prvá veta/SMS pre kontakt (max 2 vety, personalizovaná)",
      "ai_why": "Prečo PRÁVE DNES (1 veta s konkrétnym dôvodom)",
      "ai_risk": "Čo sa stane ak nekontatujeme dnes (1 veta)"
    }
  ]
}`,
      },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "{}";

  interface ClaudeOutput {
    top_insight: string;
    revenue_at_risk: string;
    enriched_items: Array<{ idx: number; ai_message_draft: string; ai_why: string; ai_risk: string }>;
  }

  try {
    const parsed = extractJson<ClaudeOutput>(raw);
    const enrichedMap = new Map(
      parsed.enriched_items.map((e) => [e.idx, e])
    );

    const enrichedItems: EnrichedPlaybookItem[] = items.map((item, i) => {
      const enrich = enrichedMap.get(i + 1);
      return {
        ...item,
        ai_message_draft: enrich?.ai_message_draft,
        ai_why:           enrich?.ai_why,
        ai_risk:          enrich?.ai_risk,
      };
    });

    return {
      date: new Date().toISOString().split("T")[0],
      agent_name: agentName,
      top_insight: parsed.top_insight,
      items: enrichedItems,
      revenue_at_risk: parsed.revenue_at_risk,
    };
  } catch {
    return {
      date: new Date().toISOString().split("T")[0],
      agent_name: agentName,
      top_insight: `Máš ${items.length} akčných bodov na dnes.`,
      items: items.map((item) => ({ ...item })),
      revenue_at_risk: "odhadovaný",
    };
  }
}
