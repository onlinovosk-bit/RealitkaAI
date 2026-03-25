export function logInfo(message: string, meta?: any) {
  console.log("[INFO]", message, meta || "");
}

export function logError(message: string, error?: any) {
  console.error("[ERROR]", message, error || "");
}

export function logWarn(message: string, meta?: any) {
  console.warn("[WARN]", message, meta || "");
}
