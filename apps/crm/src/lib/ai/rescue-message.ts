/**
 * KF6 — Real Rescue Messages
 * Predtým: "Ahoj {name}, mám pre teba novú možnosť, ktorá rieši tvoju hlavnú námietku."
 * Teraz: Claude generuje personalizovanú správu na základe historky leadu.
 *
 * Volaný z: /api/ai/rescue/trigger
 */

import { getClaudeClient, CLAUDE_HAIKU, extractJson } from "./claude";
import { withAiTimeout } from "./fallback";

export type RescueChannel = "call" | "sms" | "email" | "whatsapp";

export interface RescueContext {
  leadName:         string;
  score:            number;
  lastInteraction?: string;    // ISO date
  status?:          string;
  budget?:          string;
  propertyType?:    string;
  location?:        string;
  lastNote?:        string;    // Posledná poznámka makléra
  triggerType?:     string;    // "risk_signal" | "no_reply" | "price_drop" | "new_listing"
}

export interface RescuePlanOutput {
  channel:         RescueChannel;
  strategy:        string;           // Popis stratégie pre makléra
  messagePreview:  string;           // Konkrétna správa na odoslanie
  scheduledFor:    string;           // ISO timestamp
  callToAction:    string;           // Čo chceme aby klient urobil
  status:          "scheduled";
}

const SYSTEM = `Si expert na realitný sales recovery pre slovenský trh. \
Píšeš personalizované správy pre leady čo sa odmlčali alebo sú v riziku. \
Správy sú konkrétne, krátke, ľudské — nie generické. \
Výstup je VŽDY validný JSON bez markdown.`;

export async function generateRescuePlan(
  context: RescueContext,
  channel: RescueChannel = "sms"
): Promise<RescuePlanOutput> {
  const client = getClaudeClient();

  const channelInstructions: Record<RescueChannel, string> = {
    sms:      "SMS: max 2 vety, bez diakritiky, personalizovaný háčik, konkrétna výzva na akciu.",
    whatsapp: "WhatsApp: 2-3 vety, priateľský tón, môže mať 1 otázku, ľudský.",
    email:    "Email: predmet (max 45 znakov) + 3-4 vety, konkrétna ponuka alebo otázka.",
    call:     "Skript pre telefonát: úvodná veta, kľúčový bod, konkrétna otázka na záver.",
  };

  const daysSinceContact = context.lastInteraction
    ? Math.floor((Date.now() - new Date(context.lastInteraction).getTime()) / 86_400_000)
    : null;

  const userPrompt = `Lead na rescue:
Meno: ${context.leadName}
Score: ${context.score}/100
Dni bez kontaktu: ${daysSinceContact ?? "neznámo"}
Status: ${context.status ?? "neznámy"}
Rozpočet: ${context.budget ?? "neznámy"}
Typ nehnuteľnosti: ${context.propertyType ?? "neznámy"}
Lokalita: ${context.location ?? "neznáma"}
Trigger: ${context.triggerType ?? "risk_signal"}
Posledná poznámka: ${context.lastNote ?? "žiadna"}

Kanál: ${channel}
Inštrukcie pre kanál: ${channelInstructions[channel]}

Vráť JSON:
{
  "channel": "${channel}",
  "strategy": "Popis záchrannej stratégie pre makléra (1-2 vety)",
  "messagePreview": "Presná správa na odoslanie (personalizovaná, konkrétna)",
  "scheduledFor": "${new Date(Date.now() + 5 * 60_000).toISOString()}",
  "callToAction": "Čo chceme aby klient urobil (1 veta)",
  "status": "scheduled"
}`;

  const aiCall = client.messages.create({
    model: CLAUDE_HAIKU,
    max_tokens: 400,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userPrompt }],
  }).then((response) => {
    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    return extractJson<RescuePlanOutput>(raw);
  });

  return withAiTimeout(aiCall, hardcodedFallback(context, channel), 500);
}

function hardcodedFallback(ctx: RescueContext, channel: RescueChannel): RescuePlanOutput {
  return {
    channel,
    strategy: "Priamy kontakt s ponukou konkrétneho riešenia.",
    messagePreview: channel === "call"
      ? `Ahoj ${ctx.leadName}, volám ohľadom tvojej požiadavky. Mám pre teba konkrétnu možnosť. Môžeme si 5 minút pohovoriť?`
      : `Ahoj ${ctx.leadName}, mam pre teba update k tvojej poziadavke. Staci odpovedat ANO.`,
    scheduledFor: new Date(Date.now() + 5 * 60_000).toISOString(),
    callToAction: "Potvrdiť záujem o prezentáciu.",
    status: "scheduled",
  };
}
