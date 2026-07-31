import OpenAI from "openai";
import { observeOpenAI } from "@langfuse/openai";

import { getLangfuseConfig, isLangfuseEnabled } from "@/lib/langfuse/config";

let tracedClient: OpenAI | null | undefined;

/**
 * OpenAI client wrapped with Langfuse tracing.
 * Returns null when OPENAI_API_KEY or Langfuse keys are missing.
 */
export function getTracedOpenAIClient(): OpenAI | null {
  if (tracedClient !== undefined) return tracedClient;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !isLangfuseEnabled()) {
    tracedClient = null;
    return null;
  }

  const config = getLangfuseConfig();
  if (!config) {
    tracedClient = null;
    return null;
  }

  tracedClient = observeOpenAI(new OpenAI({ apiKey }), {
    tags: ["revolis-crm"],
    generationMetadata: {
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      baseUrl: config.baseUrl,
    },
  });

  return tracedClient;
}

/** Test-only reset — do not use in production code. */
export function resetTracedOpenAIClientCache(): void {
  tracedClient = undefined;
}
