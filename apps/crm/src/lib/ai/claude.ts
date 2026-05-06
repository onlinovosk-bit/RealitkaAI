import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY nie je nastavený");
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// Sonnet 4.6 = inteligencia + rýchlosť pre SR kontext
export const CLAUDE_SONNET = "claude-sonnet-4-6";
// Haiku = jednoduché extrakcie, krátke správy, lacnejšie
export const CLAUDE_HAIKU  = "claude-haiku-4-5-20251001";

/**
 * Extrakt JSON z response (odstraňuje markdown bloky ak model ich pridá).
 */
export function extractJson<T>(text: string): T {
  const clean = text
    .replace(/^```json\s*/m, "")
    .replace(/^```\s*/m, "")
    .replace(/```\s*$/m, "")
    .trim();
  return JSON.parse(clean) as T;
}
