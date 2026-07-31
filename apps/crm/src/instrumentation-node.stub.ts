/** Edge-runtime no-op — real OTEL init lives in instrumentation-node.ts (Node only). */
export async function initLangfuseInstrumentation(): Promise<void> {}

export async function getLangfuseSpanProcessor(): Promise<never> {
  throw new Error("Langfuse span processor is unavailable in edge runtime");
}
