import {
  SCHEDULED_EVENT_STATUSES,
  SCHEDULED_EVENT_TYPES,
  type ListScheduledEventsQuery,
  type ScheduledEventInput,
  type ScheduledEventStatus,
  type ScheduledEventType,
  type ScheduledEventUpdateInput,
} from "./types";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseIsoDate(value: string, field: string): ValidationResult<string> {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return { ok: false, error: `Neplatný dátum pre ${field}.` };
  }
  return { ok: true, value: new Date(parsed).toISOString() };
}

function parseEventType(value: unknown): ValidationResult<ScheduledEventType> {
  if (typeof value !== "string") {
    return { ok: false, error: "Chýba eventType." };
  }
  if (!SCHEDULED_EVENT_TYPES.includes(value as ScheduledEventType)) {
    return { ok: false, error: "Neplatný eventType." };
  }
  return { ok: true, value: value as ScheduledEventType };
}

function parseStatus(value: unknown): ValidationResult<ScheduledEventStatus> {
  if (typeof value !== "string") {
    return { ok: false, error: "Chýba status." };
  }
  if (!SCHEDULED_EVENT_STATUSES.includes(value as ScheduledEventStatus)) {
    return { ok: false, error: "Neplatný status." };
  }
  return { ok: true, value: value as ScheduledEventStatus };
}

export function validateScheduledEventInput(
  body: unknown,
): ValidationResult<ScheduledEventInput> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Neplatné telo požiadavky." };
  }

  const raw = body as Record<string, unknown>;

  if (!isNonEmptyString(raw.title)) {
    return { ok: false, error: "Názov udalosti je povinný." };
  }

  if (!isNonEmptyString(raw.startsAt)) {
    return { ok: false, error: "startsAt je povinné." };
  }
  if (!isNonEmptyString(raw.endsAt)) {
    return { ok: false, error: "endsAt je povinné." };
  }

  const starts = parseIsoDate(raw.startsAt, "startsAt");
  if (!starts.ok) return starts;

  const ends = parseIsoDate(raw.endsAt, "endsAt");
  if (!ends.ok) return ends;

  if (Date.parse(ends.value) <= Date.parse(starts.value)) {
    return { ok: false, error: "endsAt musí byť po startsAt." };
  }

  let eventType: ScheduledEventType = "viewing";
  if (raw.eventType !== undefined) {
    const parsedType = parseEventType(raw.eventType);
    if (!parsedType.ok) return parsedType;
    eventType = parsedType.value;
  }

  let status: ScheduledEventStatus | undefined;
  if (raw.status !== undefined) {
    const parsedStatus = parseStatus(raw.status);
    if (!parsedStatus.ok) return parsedStatus;
    status = parsedStatus.value;
  }

  let reminderMinutes: number | null = null;
  if (raw.reminderMinutes !== undefined && raw.reminderMinutes !== null) {
    const n = Number(raw.reminderMinutes);
    if (!Number.isFinite(n) || n < 0 || n > 10_080) {
      return { ok: false, error: "reminderMinutes musí byť 0–10080." };
    }
    reminderMinutes = Math.floor(n);
  }

  const leadId =
    raw.leadId === undefined || raw.leadId === null
      ? null
      : String(raw.leadId).trim() || null;

  const propertyId =
    raw.propertyId === undefined || raw.propertyId === null
      ? null
      : String(raw.propertyId).trim() || null;

  return {
    ok: true,
    value: {
      title: raw.title.trim(),
      description:
        typeof raw.description === "string" ? raw.description.trim() : "",
      location: typeof raw.location === "string" ? raw.location.trim() : "",
      startsAt: starts.value,
      endsAt: ends.value,
      timezone:
        typeof raw.timezone === "string" && raw.timezone.trim()
          ? raw.timezone.trim()
          : "Europe/Bratislava",
      eventType,
      status,
      leadId,
      propertyId,
      reminderMinutes,
      meta:
        raw.meta && typeof raw.meta === "object" && !Array.isArray(raw.meta)
          ? (raw.meta as Record<string, unknown>)
          : {},
    },
  };
}

export function validateScheduledEventUpdate(
  body: unknown,
): ValidationResult<ScheduledEventUpdateInput> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Neplatné telo požiadavky." };
  }

  const raw = body as Record<string, unknown>;
  const patch: ScheduledEventUpdateInput = {};

  if (raw.title !== undefined) {
    if (!isNonEmptyString(raw.title)) {
      return { ok: false, error: "Názov udalosti nemôže byť prázdny." };
    }
    patch.title = raw.title.trim();
  }

  if (raw.description !== undefined) {
    patch.description =
      typeof raw.description === "string" ? raw.description.trim() : "";
  }

  if (raw.location !== undefined) {
    patch.location = typeof raw.location === "string" ? raw.location.trim() : "";
  }

  if (raw.startsAt !== undefined) {
    if (!isNonEmptyString(raw.startsAt)) {
      return { ok: false, error: "startsAt nemôže byť prázdne." };
    }
    const starts = parseIsoDate(raw.startsAt, "startsAt");
    if (!starts.ok) return starts;
    patch.startsAt = starts.value;
  }

  if (raw.endsAt !== undefined) {
    if (!isNonEmptyString(raw.endsAt)) {
      return { ok: false, error: "endsAt nemôže byť prázdne." };
    }
    const ends = parseIsoDate(raw.endsAt, "endsAt");
    if (!ends.ok) return ends;
    patch.endsAt = ends.value;
  }

  if (raw.eventType !== undefined) {
    const parsedType = parseEventType(raw.eventType);
    if (!parsedType.ok) return parsedType;
    patch.eventType = parsedType.value;
  }

  if (raw.status !== undefined) {
    const parsedStatus = parseStatus(raw.status);
    if (!parsedStatus.ok) return parsedStatus;
    patch.status = parsedStatus.value;
  }

  if (raw.leadId !== undefined) {
    patch.leadId =
      raw.leadId === null ? null : String(raw.leadId).trim() || null;
  }

  if (raw.propertyId !== undefined) {
    patch.propertyId =
      raw.propertyId === null ? null : String(raw.propertyId).trim() || null;
  }

  if (raw.timezone !== undefined) {
    patch.timezone =
      typeof raw.timezone === "string" && raw.timezone.trim()
        ? raw.timezone.trim()
        : "Europe/Bratislava";
  }

  if (raw.reminderMinutes !== undefined) {
    if (raw.reminderMinutes === null) {
      patch.reminderMinutes = null;
    } else {
      const n = Number(raw.reminderMinutes);
      if (!Number.isFinite(n) || n < 0 || n > 10_080) {
        return { ok: false, error: "reminderMinutes musí byť 0–10080." };
      }
      patch.reminderMinutes = Math.floor(n);
    }
  }

  if (raw.meta !== undefined) {
    if (raw.meta === null || typeof raw.meta !== "object" || Array.isArray(raw.meta)) {
      return { ok: false, error: "meta musí byť objekt." };
    }
    patch.meta = raw.meta as Record<string, unknown>;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "Žiadne polia na aktualizáciu." };
  }

  return { ok: true, value: patch };
}

export function validateListQuery(
  searchParams: URLSearchParams,
): ValidationResult<ListScheduledEventsQuery> {
  const query: ListScheduledEventsQuery = {};

  const from = searchParams.get("from");
  if (from) {
    const parsed = parseIsoDate(from, "from");
    if (!parsed.ok) return parsed;
    query.from = parsed.value;
  }

  const to = searchParams.get("to");
  if (to) {
    const parsed = parseIsoDate(to, "to");
    if (!parsed.ok) return parsed;
    query.to = parsed.value;
  }

  if (query.from && query.to && Date.parse(query.to) <= Date.parse(query.from)) {
    return { ok: false, error: "Parameter to musí byť po from." };
  }

  const leadId = searchParams.get("leadId");
  if (leadId?.trim()) query.leadId = leadId.trim();

  const status = searchParams.get("status");
  if (status) {
    const parsed = parseStatus(status);
    if (!parsed.ok) return parsed;
    query.status = parsed.value;
  }

  const eventType = searchParams.get("eventType");
  if (eventType) {
    const parsed = parseEventType(eventType);
    if (!parsed.ok) return parsed;
    query.eventType = parsed.value;
  }

  const limitRaw = searchParams.get("limit");
  if (limitRaw) {
    const limit = Number(limitRaw);
    if (!Number.isFinite(limit) || limit < 1 || limit > 500) {
      return { ok: false, error: "limit musí byť 1–500." };
    }
    query.limit = Math.floor(limit);
  }

  return { ok: true, value: query };
}
