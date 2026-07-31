export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { isLangfuseEnabled } = await import("@/lib/langfuse/config");
  if (!isLangfuseEnabled()) return;

  const { initLangfuseInstrumentation } = await import("./instrumentation-node");
  await initLangfuseInstrumentation();
}
