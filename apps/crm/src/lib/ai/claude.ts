import Anthropic from "@anthropic-ai/sdk";

import { withAiTraceContext, type AiTraceContext } from "@/lib/langfuse/context";
import {
  logCompletion,
  logError,
  logPrompt,
  measureTokens,
} from "@/lib/langfuse/helpers";
import { isLangfuseEnabled } from "@/lib/langfuse/config";

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
export const CLAUDE_HAIKU = "claude-haiku-4-5-20251001";

function summarizeClaudeInput(
  params: Anthropic.MessageCreateParamsNonStreaming,
): Record<string, unknown> {
  const messageCount = params.messages.length;
  const hasSystem = params.system != null;
  return {
    model: params.model,
    messageCount,
    hasSystem,
    maxTokens: params.max_tokens,
    temperature: params.temperature,
  };
}

function extractClaudeText(resp: Anthropic.Message): string | undefined {
  const textBlock = resp.content.find((block) => block.type === "text");
  return textBlock?.type === "text" ? textBlock.text : undefined;
}

async function invokeClaude(
  params: Anthropic.MessageCreateParamsNonStreaming,
  tag?: string,
): Promise<Anthropic.Message> {
  const client = getClaudeClient();
  const t0 = Date.now();

  const vault: Vault = {};

  const { messages } = sanitizeMessages(
    params.messages as Array<{ role: string; content: string | Array<{ type: string; text?: string }> }>,
    vault,
  );
  const system = sanitizeSystem(
    params.system as string | Array<{ type: string; text?: string }> | undefined,
    vault,
  );

  const sanitizedParams: Anthropic.MessageCreateParamsNonStreaming = {
    ...params,
    messages: messages as Anthropic.MessageParam[],
    ...(system !== undefined
      ? { system: system as Anthropic.MessageCreateParamsNonStreaming["system"] }
      : {}),
  };

  const resp = await client.messages.create(sanitizedParams);
  const ms = Date.now() - t0;

  const vaultSize = Object.keys(vault).length;
  if (vaultSize > 0) {
    (resp as { content: Anthropic.ContentBlock[] }).content = resp.content.map((block) =>
      block.type === "text" ? { ...block, text: rehydrate(block.text, vault) } : block,
    );
  }

  process.stderr.write(
    `[ai:${tag ?? params.model}] ${ms}ms | in:${resp.usage.input_tokens} out:${resp.usage.output_tokens} | stop:${resp.stop_reason} | masked:${vaultSize}\n`,
  );
  return resp;
}

/**
 * Thin wrapper nad client.messages.create.
 * Automaticky maskuje PII (email, telefón, IBAN, RČ) pred odoslaním do Claude
 * a rehydruje placeholdery v odpovedi.
 */
export async function callClaude(
  params: Anthropic.MessageCreateParamsNonStreaming,
  tag?: string,
  trace?: AiTraceContext,
): Promise<Anthropic.Message> {
  const feature = trace?.feature ?? tag ?? String(params.model);
  const generationName = tag ?? feature;

  const runWithTracing = async (): Promise<Anthropic.Message> => {
    const observation = logPrompt({
      name: generationName,
      model: String(params.model),
      input: summarizeClaudeInput(params),
      metadata: {
        feature,
        ...(trace?.workflowType ? { workflow_type: trace.workflowType } : {}),
        ...(trace?.agencyId ? { agency_id: trace.agencyId } : {}),
      },
    });

    const t0 = Date.now();
    try {
      const resp = await invokeClaude(params, tag);
      const output = extractClaudeText(resp);
      logCompletion({
        observation,
        output: output ? output.slice(0, 2_000) : undefined,
        usage: measureTokens(resp.usage),
        latencyMs: Date.now() - t0,
      });
      return resp;
    } catch (error) {
      logError(error, observation);
      throw error;
    }
  };

  if (!isLangfuseEnabled()) {
    return invokeClaude(params, tag);
  }

  return withAiTraceContext(trace, tag, runWithTracing);
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
