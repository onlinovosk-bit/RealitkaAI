/**
 * Centralized OpenAI wrapper with automatic PII sanitization.
 * All OpenAI chat completion calls should go through callOpenAI().
 * PII (email, phone, IBAN, RČ) is masked before the request and
 * rehydrated in the response — transparent to callers.
 */
import OpenAI from "openai";
import { sanitizeMessages, rehydrate, type Vault } from "./sanitize";
import { incrementUsageMetric, SYSTEM_USAGE_AGENCY_ID } from "@/lib/usage-metrics";

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  _client = new OpenAI({ apiKey });
  return _client;
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

export type CallOpenAIResult = {
  content: string;
  promptTokens?: number;
  completionTokens?: number;
}

export async function callOpenAI(params: {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" | "text" };
  tag?: string;
  /**
   * Agentúra, ktorej sa spotreba účtuje. Bez nej spadne na systémový tenant —
   * merateľné to ostane, len neprisúditeľné konkrétnej kancelárii.
   */
  agencyId?: string;
}): Promise<CallOpenAIResult> {
  const client = getOpenAIClient();
  if (!client) throw new Error("OPENAI_API_KEY nie je nastavený");

  const vault: Vault = {};
  const { messages: sanitized } = sanitizeMessages(params.messages, vault);

  const t0  = Date.now();
  const res = await client.chat.completions.create({
    model:       params.model,
    messages:    sanitized as OpenAI.Chat.ChatCompletionMessageParam[],
    temperature: params.temperature ?? 0.7,
    ...(params.max_tokens      ? { max_tokens:      params.max_tokens      } : {}),
    ...(params.response_format ? { response_format: params.response_format } : {}),
  });
  const ms = Date.now() - t0;

  const raw     = res.choices[0]?.message?.content ?? "";
  const content = rehydrate(raw, vault);

  const vaultSize = Object.keys(vault).length;
  process.stderr.write(
    `[ai:${params.tag ?? params.model}] ${ms}ms | in:${res.usage?.prompt_tokens} out:${res.usage?.completion_tokens} | masked:${vaultSize}\n`
  );

  // Toto je jediné miesto, kde Revolis míňa OpenAI tokeny, a doteraz sa tu
  // len logovali do stderr. `usage` je skutočný počet z odpovede, nie odhad.
  // incrementUsageMetric je fail-soft (vlastný try/catch), takže výpadok
  // počítadla nikdy nezhodí samotné AI volanie.
  const totalTokens =
    (res.usage?.prompt_tokens ?? 0) + (res.usage?.completion_tokens ?? 0);
  if (totalTokens > 0) {
    await incrementUsageMetric({
      agencyId: params.agencyId ?? SYSTEM_USAGE_AGENCY_ID,
      metric: "ai_openai_tokens",
      delta: totalTokens,
    });
  }

  return {
    content,
    promptTokens:     res.usage?.prompt_tokens,
    completionTokens: res.usage?.completion_tokens,
  };
}
