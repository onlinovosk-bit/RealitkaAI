import type { LangfuseSpanProcessor } from "@langfuse/otel";

import { getLangfuseConfig } from "@/lib/langfuse/config";

let langfuseSpanProcessor: LangfuseSpanProcessor | null = null;
let initPromise: Promise<LangfuseSpanProcessor> | null = null;

async function loadSpanProcessor(): Promise<LangfuseSpanProcessor> {
  if (langfuseSpanProcessor) return langfuseSpanProcessor;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const config = getLangfuseConfig();
    if (!config) {
      throw new Error("instrumentation-node loaded without Langfuse config");
    }

    const { LangfuseSpanProcessor: Processor } = await import("@langfuse/otel");
    const { NodeSDK } = await import("@opentelemetry/sdk-node");

    langfuseSpanProcessor = new Processor({
      publicKey: config.publicKey,
      secretKey: config.secretKey,
      baseUrl: config.baseUrl,
      ...(process.env.VERCEL ? { exportMode: "immediate" as const } : {}),
    });

    const sdk = new NodeSDK({
      spanProcessors: [langfuseSpanProcessor],
    });

    sdk.start();
    return langfuseSpanProcessor;
  })();

  return initPromise;
}

/** Next.js instrumentation hook — Node runtime only. */
export async function initLangfuseInstrumentation(): Promise<void> {
  await loadSpanProcessor();
}

/** Flush helper for serverless routes — resolves processor lazily. */
export async function getLangfuseSpanProcessor(): Promise<LangfuseSpanProcessor> {
  return loadSpanProcessor();
}
