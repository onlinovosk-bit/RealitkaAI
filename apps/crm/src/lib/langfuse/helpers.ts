import {
  startActiveObservation,
  startObservation,
  updateActiveObservation,
  type LangfuseGeneration,
  type LangfuseObservation,
} from "@langfuse/tracing";

import { isLangfuseEnabled } from "@/lib/langfuse/config";

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type OpenAIUsageShape = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

export type AnthropicUsageShape = {
  input_tokens: number;
  output_tokens: number;
};

export type PromptLogInput = {
  name: string;
  model: string;
  input: unknown;
  metadata?: Record<string, unknown>;
};

export type CompletionLogInput = {
  observation: LangfuseObservation | null;
  output: unknown;
  usage?: TokenUsage;
  latencyMs?: number;
};

/** Start a Langfuse generation observation for a prompt. Returns null when tracing is disabled. */
export function logPrompt(input: PromptLogInput): LangfuseGeneration | null {
  if (!isLangfuseEnabled()) return null;

  return startObservation(
    input.name,
    {
      model: input.model,
      input: input.input,
      metadata: input.metadata,
    },
    { asType: "generation" },
  );
}

/** Finalize a generation observation with output, token usage, and latency. */
export function logCompletion(input: CompletionLogInput): void {
  if (!input.observation) return;

  input.observation.update({
    output: input.output,
    usageDetails: input.usage
      ? {
          input: input.usage.inputTokens,
          output: input.usage.outputTokens,
          total: input.usage.totalTokens,
        }
      : undefined,
    metadata:
      input.latencyMs !== undefined ? { latencyMs: input.latencyMs } : undefined,
  });
  input.observation.end();
}

/** Record an error on the active or supplied observation. */
export function logError(error: unknown, observation?: LangfuseObservation | null): void {
  if (!isLangfuseEnabled()) return;

  const message = error instanceof Error ? error.message : String(error);

  if (observation) {
    observation.update({ level: "ERROR", statusMessage: message });
    observation.end();
    return;
  }

  updateActiveObservation({ level: "ERROR", statusMessage: message });
}

/** Normalize token counts from OpenAI or Anthropic usage objects. */
export function measureTokens(usage: OpenAIUsageShape | AnthropicUsageShape): TokenUsage {
  if ("input_tokens" in usage) {
    return {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      totalTokens: usage.input_tokens + usage.output_tokens,
    };
  }

  const inputTokens = usage.prompt_tokens ?? 0;
  const outputTokens = usage.completion_tokens ?? 0;

  return {
    inputTokens,
    outputTokens,
    totalTokens: usage.total_tokens ?? inputTokens + outputTokens,
  };
}

export type MeasureLatencyOptions = {
  asType?: "span" | "generation";
  metadata?: Record<string, unknown>;
};

/** Wrap an async call with Langfuse latency tracing. Falls back to timing-only when disabled. */
export async function measureLatency<T>(
  name: string,
  fn: () => Promise<T>,
  options?: MeasureLatencyOptions,
): Promise<{ result: T; latencyMs: number }> {
  if (!isLangfuseEnabled()) {
    const startedAt = Date.now();
    const result = await fn();
    return { result, latencyMs: Date.now() - startedAt };
  }

  let result!: T;
  let latencyMs = 0;

  await startActiveObservation(
    name,
    async (span) => {
      const startedAt = Date.now();
      result = await fn();
      latencyMs = Date.now() - startedAt;
      span.update({
        output: result,
        metadata: { latencyMs, ...options?.metadata },
      });
    },
    { asType: options?.asType ?? "span" },
  );

  return { result, latencyMs };
}
