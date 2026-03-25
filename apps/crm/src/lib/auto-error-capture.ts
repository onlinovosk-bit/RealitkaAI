import { logError } from "./logger";

import fs from "fs";
import path from "path";

const ERROR_LOG_PATH = path.resolve(process.cwd(), "error-capture.log");

export function autoErrorCapture(error: unknown, context?: string) {
  const message =
    error instanceof Error ? error.message : "Neznáma chyba";
  const stack = error instanceof Error ? error.stack : undefined;
  const timestamp = new Date().toISOString();

  // Log to console
  logError(context || "AutoErrorCapture", error);

  // Prepare log entry
  const entry = JSON.stringify({
    timestamp,
    context: context || "AutoErrorCapture",
    message,
    stack,
    raw: String(error),
  }) + "\n";

  // Append to file
  try {
    fs.appendFileSync(ERROR_LOG_PATH, entry, { encoding: "utf-8" });
  } catch (fileError) {
    logError("Failed to write error log", fileError);
  }

  return {
    ok: false,
    error: message,
  };
}
