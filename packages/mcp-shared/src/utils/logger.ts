import { randomUUID } from "crypto";

export function generateRequestId(): string {
  return randomUUID();
}

export interface LogContext {
  request_id: string;
  server: string;
  tool: string;
  lead_id?: string;
  agent_id?: string;
  [key: string]: unknown;
}

export interface Logger {
  info(msg: string, extra?: Record<string, unknown>): void;
  warn(msg: string, extra?: Record<string, unknown>): void;
  error(msg: string, extra?: Record<string, unknown>): void;
}

// MCP servers run over stdio — log to stderr to avoid protocol pollution.
export function createLogger(context: LogContext): Logger {
  const ts = () => new Date().toISOString();
  const write = (level: string, msg: string, extra?: Record<string, unknown>) =>
    process.stderr.write(
      JSON.stringify({ level, ts: ts(), msg, ...context, ...extra }) + "\n"
    );

  return {
    info:  (msg, extra) => write("INFO",  msg, extra),
    warn:  (msg, extra) => write("WARN",  msg, extra),
    error: (msg, extra) => write("ERROR", msg, extra),
  };
}
