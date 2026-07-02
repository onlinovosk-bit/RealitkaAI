import { coerceString, isRecord } from "@/lib/uc/shared";

export type UcAction = 1 | 2;

export type UcRequestPayload = {
  user: string;
  pass: string;
  action: UcAction;
  data: unknown;
};

export function parseUcIncomingPayload(raw: Record<string, unknown>): UcRequestPayload | null {
  const user = coerceString(raw.user);
  const pass = coerceString(raw.pass) ?? coerceString(raw.token);
  const actionRaw = coerceString(raw.action);
  const dataRaw = raw.data;

  if (!user || !pass || !actionRaw || dataRaw == null) return null;
  if (actionRaw !== "1" && actionRaw !== "2") return null;

  let data: unknown = dataRaw;
  if (typeof dataRaw === "string") {
    const trimmed = dataRaw.trim();
    if (!trimmed) return null;
    try {
      data = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  if (!isRecord(data)) return null;

  return {
    user,
    pass,
    action: Number(actionRaw) as UcAction,
    data,
  };
}

export function extractUcExternalId(action: UcAction, data: Record<string, unknown>): string | null {
  if (action === 1) {
    return coerceString(data.object_id) ?? coerceString(data.id);
  }
  return coerceString(data.user_id) ?? coerceString(data.import_id);
}

export function isUcDeleteRequest(data: Record<string, unknown>): boolean {
  return data.deleted === 1 || data.deleted === true || data.deleted === "1";
}
