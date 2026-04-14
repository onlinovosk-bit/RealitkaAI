/**
 * Parsovanie dátumu z poznámky makléra (dynamické — nie pevný dátum).
 * Pripomienka: ten istý kalendárny deň o 8:00 (Europe/Bratislava na API).
 */

const SK_DATE_RE = /\b(\d{1,2})[./](\d{1,2})[./](\d{2,4})\b/;
const ISO_DATE_RE = /\b(\d{4})-(\d{2})-(\d{2})\b/;
const TIME_RE = /\b(\d{1,2})[.:](\d{2})\b/;

function isValidYmd(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Formát YYYYMMDDTHHmmss pre parameter dates (lokálny čas prehliadača pri fallback URL). */
function formatGCalLocal(dt: Date): string {
  return (
    `${dt.getFullYear()}${pad2(dt.getMonth() + 1)}${pad2(dt.getDate())}` +
    `T${pad2(dt.getHours())}${pad2(dt.getMinutes())}00`
  );
}

export function buildGoogleCalendarTemplateUrl(opts: {
  title: string;
  details?: string;
  start: Date;
  end: Date;
}): string {
  const dates = `${formatGCalLocal(opts.start)}/${formatGCalLocal(opts.end)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates,
  });
  if (opts.details) params.set("details", opts.details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export type ParsedViewingParts = {
  year: number;
  month: number;
  day: number;
  viewingTimeLabel: string;
};

/**
 * Vyťahá z textu dátum (SK alebo ISO) a voliteľne čas obhliadky.
 * Každá poznámka môže mať iný dátum — berie sa z obsahu `note`.
 */
export function parseViewingNoteParts(note: string): ParsedViewingParts | null {
  const trimmed = note.trim();
  if (!trimmed) return null;

  let y: number;
  let month: number;
  let day: number;

  const sk = trimmed.match(SK_DATE_RE);
  const iso = trimmed.match(ISO_DATE_RE);
  if (sk) {
    day = parseInt(sk[1], 10);
    month = parseInt(sk[2], 10);
    let yRaw = parseInt(sk[3], 10);
    y = yRaw < 100 ? yRaw + 2000 : yRaw;
  } else if (iso) {
    y = parseInt(iso[1], 10);
    month = parseInt(iso[2], 10);
    day = parseInt(iso[3], 10);
  } else {
    return null;
  }

  if (y < 2000 || y > 2100) return null;
  if (!isValidYmd(y, month, day)) return null;

  const timeMatch = trimmed.match(TIME_RE);
  const viewingTimeLabel = timeMatch
    ? `${pad2(parseInt(timeMatch[1], 10))}:${timeMatch[2]}`
    : "";

  return { year: y, month, day, viewingTimeLabel };
}

export type ParsedViewingFromNote = {
  /** Lokálne dáta prehliadača (fallback odkaz). */
  reminderStart: Date;
  reminderEnd: Date;
  viewingTimeLabel: string;
};

export function parseViewingNote(note: string): ParsedViewingFromNote | null {
  const parts = parseViewingNoteParts(note);
  if (!parts) return null;

  const reminderStart = new Date(parts.year, parts.month - 1, parts.day, 8, 0, 0, 0);
  const reminderEnd = new Date(parts.year, parts.month - 1, parts.day, 8, 25, 0, 0);

  return {
    reminderStart,
    reminderEnd,
    viewingTimeLabel: parts.viewingTimeLabel,
  };
}

export function openGoogleCalendarUrl(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
