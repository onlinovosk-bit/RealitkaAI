import type { BuyerReadinessDto } from "@/services/playbook/types";

interface CallContext {
  buyer: BuyerReadinessDto;
  propertyTitle?: string;
  officeName?: string;
  locale?: "sk-SK" | "cs-CZ" | "en-US";
}

export function buildCallScriptPrompt(ctx: CallContext): string {
  const { buyer, propertyTitle, officeName, locale = "sk-SK" } = ctx;

  const baseIntro =
    locale === "sk-SK"
      ? `Si senior realitný maklér v kancelárii ${officeName ?? "Revolis Partner"}.`
      : `You are a senior real estate agent at ${officeName ?? "Revolis Partner"}.`;

  const segmentInstruction = getSegmentInstruction(buyer, locale);

  const propertyLine =
    propertyTitle && locale === "sk-SK"
      ? `Klient prejavil záujem o nehnuteľnosť: "${propertyTitle}".`
      : propertyTitle
      ? `The client showed interest in: "${propertyTitle}".`
      : "";

  const reasonsText =
    buyer.reasons && buyer.reasons.length
      ? locale === "sk-SK"
        ? `Dôvody, prečo má vysoký Buyer Readiness Index: ${buyer.reasons.join(", ")}.`
        : `Reasons for high Buyer Readiness Index: ${buyer.reasons.join(", ")}.`
      : "";

  const outputInstruction =
    locale === "sk-SK"
      ? `Vygeneruj konkrétny telefonický skript v slovenčine:
- krátky icebreaker (1 veta),
- 2–3 vety, ktoré referujú na jeho správanie (bez toho, aby si pôsobil creepy),
- 1 jasná výzva k akcii (obhliadka / rozhodnutie / ďalší krok),
- tón: profesionálny, priamy, ľudský, bez zbytočného small talku.
Text vráť ako čistý text, bez odrážok.`
      : `Generate a concrete call script:
- short icebreaker (1 sentence),
- 2–3 sentences referencing their behavior (without sounding creepy),
- 1 clear call to action (viewing / decision / next step),
- tone: professional, direct, human, no unnecessary small talk.
Return plain text, no bullets.`;

  return [
    baseIntro,
    "",
    locale === "sk-SK"
      ? `Klient: ${buyer.buyerName ?? "neznámy klient"}, Buyer Readiness Index: ${buyer.totalScore}/100.`
      : `Client: ${buyer.buyerName ?? "unknown client"}, Buyer Readiness Index: ${buyer.totalScore}/100.`,
    propertyLine,
    reasonsText,
    "",
    segmentInstruction,
    "",
    outputInstruction,
  ]
    .filter(Boolean)
    .join("\n");
}

function getSegmentInstruction(
  buyer: BuyerReadinessDto,
  locale: CallContext["locale"]
): string {
  const s = buyer.segment;
  if (locale === "sk-SK") {
    if (s === "HOT_NOW") {
      return "Klient je v segmente HOT NOW – cieľ hovoru: dotiahnuť konkrétny krok (obhliadka alebo rozhodnutie). Buď priamy, ale nie agresívny.";
    }
    if (s === "HIGH_PRIORITY") {
      return "Klient je v segmente HIGH PRIORITY – cieľ hovoru: potvrdiť záujem, zistiť detaily a navrhnúť konkrétny ďalší krok.";
    }
    if (s === "NURTURE") {
      return "Klient je v segmente NURTURE – cieľ hovoru: budovať dôveru, zistiť časovanie a nastaviť ďalší kontakt. Žiadny tlak.";
    }
    return "Klient je v segmente LOW INTENT – ak voláš, buď veľmi jemný, skôr zisťuj situáciu a potreby.";
  } else {
    if (s === "HOT_NOW") {
      return "Client is in HOT NOW segment – goal: move to a concrete step (viewing or decision). Be direct but not pushy.";
    }
    if (s === "HIGH_PRIORITY") {
      return "Client is in HIGH PRIORITY segment – goal: confirm interest, clarify details, propose a clear next step.";
    }
    if (s === "NURTURE") {
      return "Client is in NURTURE segment – goal: build trust, understand timing, and schedule a follow-up. No pressure.";
    }
    return "Client is in LOW INTENT segment – if you call, be very soft, focus on understanding their situation.";
  }
}
