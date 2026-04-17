/**
 * Heuristická analýza prepisu hovoru (NLP-lite pred plným LLM).
 * Rozšíriteľné o OpenAI structured output neskôr.
 */

export type CallAnalysisResult = {
  score: number;
  strengths: string[];
  weaknesses: string[];
};

const CLOSING_HINTS = /obhliadka|stretnutie|termín|zajtra|budúci týždeň|kalendár|dohodn|rezerv/i;
const GREETING_HINTS = /dobrý deň|ahoj|ďakujem|teší ma|rád vás/i;
const PRICE_OBJECTION = /cena|drah|eur|€|rozpočet|hypotéka|zľava|zlacn/i;

export function analyzeCall(text: string): CallAnalysisResult {
  const t = String(text || "").trim();
  const lower = t.toLowerCase();
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  let score = 55;

  if (t.length < 40) {
    weaknesses.push("krátky prepis — chýba kontext celej konverzácie");
    score -= 15;
  }

  if (GREETING_HINTS.test(lower)) {
    strengths.push("dobré nadviazanie kontaktu");
    score += 12;
  }

  if (/ďakujem|ďakujeme/i.test(lower)) {
    strengths.push("pozitívna komunikácia / uzavretie témy");
    score += 8;
  }

  if (CLOSING_HINTS.test(lower)) {
    strengths.push("návrh ďalšieho kroku alebo termínu");
    score += 18;
  } else {
    weaknesses.push("neuzavretý konkrétny ďalší krok (termín / obhliadka)");
    score -= 18;
  }

  if (PRICE_OBJECTION.test(lower)) {
    if (/porovna|podobn|trh|hodnota|invest/i.test(lower)) {
      strengths.push("práca s témou ceny / hodnoty");
      score += 10;
    } else {
      weaknesses.push("námietka ceny bez jasného uzavretia argumentom");
      score -= 12;
    }
  }

  if (/klient|záujem|môžem|kedy|áno|jasné/i.test(lower)) {
    strengths.push("klient reaguje a participuje");
    score += 10;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return { score, strengths, weaknesses };
}
