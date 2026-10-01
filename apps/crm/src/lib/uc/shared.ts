export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function coerceString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

export function coerceBool(value: unknown): boolean {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  return false;
}

export function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function partitionKnownFields(
  data: Record<string, unknown>,
  known: ReadonlySet<string>,
): { known: Record<string, unknown>; raw: Record<string, unknown> } {
  const knownFields: Record<string, unknown> = {};
  const raw: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (known.has(key)) knownFields[key] = value;
    else raw[key] = value;
  }

  return { known: knownFields, raw };
}
