import { logError } from "./logger";

export function handleError(error: unknown, context?: string) {
  const message =
    error instanceof Error ? error.message : "Neznáma chyba";

  logError(context || "Unhandled error", error);

  return {
    ok: false,
    error: message,
  };
}
