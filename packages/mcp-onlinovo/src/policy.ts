export const WRITE_DISABLED_CODE = "WRITE_DISABLED_IN_MVP";

export function denyWrite(tool: string): { code: string; message: string } {
  return {
    code: WRITE_DISABLED_CODE,
    message: `${tool} is a write tool. MVP is read-only. Writes need human approval in a later ONL-MCP slice.`,
  };
}

export function parseThreshold(args: unknown, fallback = 5): number {
  const raw = args && typeof args === "object" ? (args as { threshold?: unknown }).threshold : undefined;
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return fallback;
}
