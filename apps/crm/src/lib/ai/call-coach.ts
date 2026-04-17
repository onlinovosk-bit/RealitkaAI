import type { CallAnalysisResult } from "./call-analysis";

export type CallCoachingResult = {
  tip: string;
  nextStep: string;
};

/**
 * Odporúčania na základe analýzy (pravidlá → text; neskôr LLM).
 */
export function generateCallCoaching(analysis: CallAnalysisResult): CallCoachingResult {
  const weak = analysis.weaknesses.join(" ").toLowerCase();

  let tip =
    "Na konci hovoru vždy navrhni konkrétny termín obhliadky alebo ďalší hovor do 48 hodín.";
  if (weak.includes("cena") || weak.includes("námietka")) {
    tip =
      "Pri cene: zopakuj hodnotu (lokalita, stav), porovnaj s podobnými predajmi a navrhni obhliadku ako ďalší krok.";
  }
  if (weak.includes("krátky prepis")) {
    tip = "Nahrávaj celý hovor alebo dopíš poznámky — bez plného kontextu AI nemôže presne skórovať.";
  }
  if (weak.includes("ďalší krok") || weak.includes("termín")) {
    tip = "Uzatváraj: „Navrhujem obhliadku vo štvrtok 15:00 alebo piatok 10:00 — čo vám vyhovuje viac?“";
  }

  const nextStep =
    analysis.score >= 70
      ? "Pošli SMS s potvrdením termínu a pripomeň adresu nehnuteľnosti."
      : "Zavolaj klientovi zajtra do 10:00 a uzavri jeden konkrétny termín obhliadky.";

  return { tip, nextStep };
}
