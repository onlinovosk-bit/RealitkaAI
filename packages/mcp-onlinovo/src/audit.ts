import { createLogger, generateRequestId } from "@revolis/mcp-shared";

export function beginAudit(tool: string) {
  const request_id = generateRequestId();
  const log = createLogger({ request_id, server: "mcp-onlinovo", tool });
  const started = Date.now();
  return {
    request_id,
    log,
    finish(extra?: Record<string, unknown>) {
      log.info("tool_done", { latency_ms: Date.now() - started, ...extra });
    },
  };
}
