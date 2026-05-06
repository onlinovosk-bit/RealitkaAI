/**
 * KF3 — Real Call Coach
 * Predtým: hardcoded score=72, rovnaké strengths/improvements zakaždý.
 * Teraz: skutočná analýza hovoru + personalizovaný coaching.
 *
 * Existujúce volania tejto funkcie fungujú bez zmien.
 */

import { getClaudeClient, CLAUDE_HAIKU, extractJson } from "./claude";

export type CoachFeedback = {
  score:           number;        // 0–100 kvalita hovoru
  strengths:       string[];      // Čo maklér robil dobre
  improvements:    string[];      // Konkrétne zlepšenia
  tip:             string;        // Jeden kľúčový tip na ďalší hovor
  next_suggestions: string[];     // 1-3 vety čo mohol povedať lepšie
};

const SYSTEM = `Si realitný sales coach so 20 rokmi praxe v SR. \
Dávaš úprimnú, konkrétnu spätnú väzbu — nie generické pochvaly. \
Sústreď sa na čo maklér mohol urobiť inak, aby zvýšil šancu kúpy. \
Výstup je VŽDY validný JSON bez markdown.`;

export async function generateCallCoachFeedback(transcript: string): Promise<CoachFeedback> {
  if (!transcript?.trim() || transcript.trim().length < 80) {
    return defaultFeedback();
  }

  const client = getClaudeClient();

  const response = await client.messages.create({
    model: CLAUDE_HAIKU,
    max_tokens: 500,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: `Ohodnoť hovor makléra na základe prepisu:\n\n${transcript.slice(0, 6_000)}\n\nVráť JSON:
{
  "score": 0-100,
  "strengths": ["max 3 konkrétne veci čo maklér robil dobre"],
  "improvements": ["max 3 konkrétne veci na zlepšenie s dôvodom prečo"],
  "tip": "Jeden kľúčový tip na ďalší hovor (1 veta, akčný)",
  "next_suggestions": ["1-3 alternatívne vety čo mohol povedať pri konkrétnych momentoch hovoru"]
}`,
      },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  try {
    return extractJson<CoachFeedback>(raw);
  } catch {
    return defaultFeedback();
  }
}

function defaultFeedback(): CoachFeedback {
  return {
    score: 0,
    strengths: [],
    improvements: ["Hovor nebol dostatočne dlhý na analýzu."],
    tip: "Prepis musí mať aspoň 80 znakov.",
    next_suggestions: [],
  };
}
