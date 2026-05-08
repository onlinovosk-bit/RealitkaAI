import Anthropic from "@anthropic-ai/sdk";
import { sanitizeMessages, sanitizeSystem, rehydrate, type Vault } from "./sanitize";

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
 * Thin wrapper nad client.messages.create.
 * Automaticky maskuje PII (email, telefón, IBAN, RČ) pred odoslaním do Claude
 * a rehydruje placeholdery v odpovedi.
 */
export async function callClaude(
  params: Anthropic.MessageCreateParamsNonStreaming,
  tag?:   string
): Promise<Anthropic.Message> {
  const client = getClaudeClient();
  const t0     = Date.now();

  const vault: Vault = {};

  const { messages } = sanitizeMessages(
    params.messages as Array<{ role: string; content: string | Array<{ type: string; text?: string }> }>,
    vault
  );
  const system = sanitizeSystem(
    params.system as string | Array<{ type: string; text?: string }> | undefined,
    vault
  );

  const sanitizedParams: Anthropic.MessageCreateParamsNonStreaming = {
    ...params,
    messages: messages as Anthropic.MessageParam[],
    ...(system !== undefined ? { system: system as Anthropic.MessageCreateParamsNonStreaming['system'] } : {}),
  };

  const resp = await client.messages.create(sanitizedParams);
  const ms   = Date.now() - t0;

  const vaultSize = Object.keys(vault).length;
  if (vaultSize > 0) {
    (resp as { content: Anthropic.ContentBlock[] }).content = resp.content.map(block =>
      block.type === 'text' ? { ...block, text: rehydrate(block.text, vault) } : block
    );
  }

  process.stderr.write(
    `[ai:${tag ?? params.model}] ${ms}ms | in:${resp.usage.input_tokens} out:${resp.usage.output_tokens} | stop:${resp.stop_reason} | masked:${vaultSize}\n`
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
