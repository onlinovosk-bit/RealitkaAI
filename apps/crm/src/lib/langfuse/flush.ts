import { isLangfuseEnabled } from "@/lib/langfuse/config";

/** Flush pending Langfuse spans — call from serverless routes via `after()`. */
export async function flushLangfuseTraces(): Promise<void> {
  if (!isLangfuseEnabled()) return;

  const { getLangfuseSpanProcessor } = await import("@/instrumentation-node");
  const processor = await getLangfuseSpanProcessor();
  await processor.forceFlush();
}
