export async function safeServerAction<T>(
  fn: () => Promise<T>,
  fallbackMessage = "Nastala neočakávaná chyba."
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : fallbackMessage,
    };
  }
}
