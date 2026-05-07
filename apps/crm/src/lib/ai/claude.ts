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

export const CLAUDE_SONNET = "claude-sonnet-4-6";
export const CLAUDE_HAIKU  = "claude-haiku-4-5-20251001";

/**
 * Thin wrapper nad client.messages.create s latency + token logovaním.
 * Logy idú na stderr — neovplyvňujú MCP protokol ani HTTP response.
 * Výstup: evaluation infrastructure (Alexander Wang round table).
 */
export async function callClaude(
  params:  Anthropic.MessageCreateParamsNonStreaming,
  tag?:    string
): Promise<Anthropic.Message> {
  const client = getClaudeClient();
  const t0     = Date.now();
  const resp   = await client.messages.create(params);
  const ms     = Date.now() - t0;
  process.stderr.write(
    `[ai:${tag ?? params.model}] ${ms}ms | in:${resp.usage.input_tokens} out:${resp.usage.output_tokens} | stop:${resp.stop_reason}\n`
  );
  return resp;
}

/**
 * Extrakt JSON z response (odstraňuje markdown bloky ak model ich pridá).
 */
export function extractJson<T>(text: string): T {
  const clean = text
    .replace(/^```json\s*/m, "")
    .replace(/^```\s*/m, "")
    .replace(/```\s*$/m, "")
    .trim();
  try {
    return JSON.parse(clean) as T;
  } catch {
    throw new Error(`AI returned invalid JSON: ${clean.slice(0, 120)}`);
  }
}
