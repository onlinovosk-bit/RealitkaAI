import { getDealProbability } from "./probability";

export type ObjectionKind = "price" | "timing" | "none";

export type DealStrategyInput = {
  score: number;
  status: string;
  note?: string;
  financing?: string;
  timeline?: string;
  timeToCloseDays: number;
};

/**
 * Detekcia námiet z voľného textu (poznámka leadu, timeline…).
 */
export function detectObjection(text: string): ObjectionKind {
  const t = String(text || "").toLowerCase();
  if (/cena|drah|eur|€|rozpočet|hypotéka|úver|drahý|zlacn/i.test(t)) return "price";
  if (/čas|neskôr|mesiac|rok|nemám čas|neskúr/i.test(t)) return "timing";
  return "none";
}

/**
 * Generuje kroky uzavretia obchodu z lead kontextu + horizontu TTC.
 */
export function generateDealStrategy(input: DealStrategyInput): string[] {
  const steps: string[] = [];
  const st = String(input.status || "").toLowerCase();
  const objection = detectObjection(
    `${input.note ?? ""} ${input.financing ?? ""} ${input.timeline ?? ""}`
  );

  if (input.score > 80) {
    steps.push("Zavolať klientovi ešte dnes a potvrdiť záujem.");
    steps.push("Navrhnúť konkrétny termín obhliadky (2 časové okná).");
  } else if (input.score >= 50) {
    steps.push("Krátky follow-up hovor: zhrň benefit a ďalší krok.");
    steps.push("Navrhnúť obhliadku do 48 hodín.");
  } else {
    steps.push("Poslať hodnotový súhrn (lokalita + porovnateľné predaje).");
    steps.push("Objednať si ďalší kontakt o 3 dni.");
  }

  if (objection === "price") {
    steps.push("Použiť argument podobných predajov v lokalite a ROI bývania.");
  }
  if (objection === "timing") {
    steps.push("Zjednotiť časovú os — čo musí byť hotové pred podpisom.");
  }

  if (input.timeToCloseDays < 7) {
    steps.push("Vytvoriť miernu urgenciu (obmedzený záujem / ďalší záujemca).");
  }

  if (st.includes("obhli") || st.includes("ponuka")) {
    steps.push("Uzavrieť detaily ponuky a termín odpovede klienta.");
  }

  return steps;
}

export function prioritizeSteps(steps: string[], max = 3): string[] {
  return steps.slice(0, Math.max(0, max));
}

/** Jednoduchá pravdepodobnosť uzavretia pre UI (0–100). */
export function strategyCloseProbability(input: DealStrategyInput): number {
  const p = getDealProbability(Math.max(0, Math.min(100, input.score)));
  const ttcBoost = input.timeToCloseDays <= 7 ? 0.08 : input.timeToCloseDays <= 14 ? 0.04 : 0;
  return Math.round(Math.min(0.95, p + ttcBoost) * 100);
}
