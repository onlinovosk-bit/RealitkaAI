export type RealsoftAction = 1 | 2;

export type RealsoftRequestPayload = {
  user: string;
  pass: string;
  action: RealsoftAction;
  data: unknown;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePath(path: string): string[] {
  return path
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function getValueByPath(payload: unknown, path: string): unknown {
  if (!path.trim()) return undefined;
  const parts = normalizePath(path);
  let current: unknown = payload;
  for (const part of parts) {
    if (!isRecord(current)) return undefined;
    current = current[part];
  }
  return current;
}

export function coerceString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

export function extractExternalIdFromConfiguredPath(
  action: RealsoftAction,
  data: unknown,
): string | null {
  if (!isRecord(data)) return null;

  const path =
    action === 1
      ? process.env.REALSOFT_EXTERNAL_ID_PATH_ACTION_1
      : process.env.REALSOFT_EXTERNAL_ID_PATH_ACTION_2;

  if (path?.trim()) {
    const value = getValueByPath(data, path);
    const fromPath = coerceString(value);
    if (fromPath) return fromPath;
  }

  if (action === 1) {
    return coerceString(data.object_id) ?? coerceString(data.id);
  }

  return coerceString(data.user_id) ?? coerceString(data.import_id);
}

