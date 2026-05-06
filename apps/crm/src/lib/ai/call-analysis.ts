/**
 * KF2 — Real Call Analysis
 * Predtým: hardcoded stub (vždy "neutral", "Hovor prebehol štandardne.")
 * Teraz: skutočná analýza prepisu hovoru cez Claude.
 *
 * Existujúce route: POST /api/ai/call/analyze — volá analyzeCall() bez zmien.
 */

import { getClaudeClient, CLAUDE_HAIKU, extractJson } from "./claude";

export type CallAnalysisResult = {
  sentiment:       "positive" | "neutral" | "negative";
  sentiment_arc:   "IMPROVING" | "DECLINING" | "FLAT";
  keyTopics:       string[];
  objections:      string[];
  buying_signals:  string[];
  nextAction:      string;
  score:           number;   // 0–100 záujmové skóre leadu po hovore
  summary:         string;
  escalation_needed: boolean; // true ak treba senior makléra/manažéra
};

const SYSTEM = `Si expert analytik realitných hovorov pre slovenský trh. \
Analyzuješ prepisy a extraktuješ kľúčové fakty pre makléra. \
Buď konkrétny — vyhni sa vágnym zovšeobecneniam. \
Výstup je VŽDY validný JSON bez markdown.`;

export async function analyzeCall(transcript: string): Promise<CallAnalysisResult> {
  if (!transcript?.trim() || transcript.trim().length < 50) {
    return fallback("Prepis je príliš krátky na analýzu.");
  }

  const client = getClaudeClient();
  // Max 8 000 znakov — zvyšok je dekorujúci text, nie kľúčové info.
  const safeTranscript = transcript.slice(0, 8_000);

  const response = await client.messages.create({
    model: CLAUDE_HAIKU,
    max_tokens: 600,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: `Analyzuj tento prepis hovoru makléra s klientom:\n\n${safeTranscript}\n\nVráť JSON:
{
  "sentiment": "positive|neutral|negative",
  "sentiment_arc": "IMPROVING|DECLINING|FLAT",
  "keyTopics": ["zoznam tém diskutovaných v hovore"],
  "objections": ["námietky klienta — buď konkrétny, napr. 'cena je 20k nad rozpočtom'"],
  "buying_signals": ["signály záujmu — napr. 'pýtal sa na termín odovzdania'"],
  "nextAction": "Jedna konkrétna akcia makléra do 24h (imperatív, max 12 slov)",
  "score": 0-100,
  "summary": "2-3 vety o tom čo sa stalo a čo je najdôležitejšie",
  "escalation_needed": true/false
}`,
      },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  try {
    return extractJson<CallAnalysisResult>(raw);
  } catch {
    return fallback("Analýza zlyhala — skontroluj prepis.");
  }
}

function fallback(msg: string): CallAnalysisResult {
  return {
    sentiment: "neutral",
    sentiment_arc: "FLAT",
    keyTopics: [],
    objections: [],
    buying_signals: [],
    nextAction: msg,
    score: 50,
    summary: msg,
    escalation_needed: false,
  };
}
