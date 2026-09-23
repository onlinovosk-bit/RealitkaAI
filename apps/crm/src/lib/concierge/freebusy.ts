/**
 * N09 — Google Calendar free/busy for Concierge booking (M2 prep).
 *
 * Real OAuth tokens live behind GO-B08-OAUTH. This module is the contract:
 * - agency_id always required
 * - returns busy intervals or `oauth_missing` without inventing availability
 */

export type FreeBusyInterval = { start: string; end: string };

export type FreeBusyResult =
  | { ok: true; busy: FreeBusyInterval[]; calendarId: string }
  | { ok: false; reason: "oauth_missing" | "invalid_window" | "upstream_error"; detail?: string };

export type FreeBusyQuery = {
  agencyId: string;
  calendarId: string;
  timeMin: string;
  timeMax: string;
  accessToken?: string | null;
};

export function validateFreeBusyWindow(
  timeMin: string,
  timeMax: string,
): { ok: true } | { ok: false; reason: "invalid_window" } {
  const a = Date.parse(timeMin);
  const b = Date.parse(timeMax);
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) {
    return { ok: false, reason: "invalid_window" };
  }
  // Cap window at 14 days to avoid abuse
  if (b - a > 14 * 86_400_000) {
    return { ok: false, reason: "invalid_window" };
  }
  return { ok: true };
}

/**
 * Pure merge of busy blocks — used when Google returns overlapping intervals.
 */
export function mergeBusyIntervals(
  intervals: FreeBusyInterval[],
): FreeBusyInterval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort(
    (x, y) => Date.parse(x.start) - Date.parse(y.start),
  );
  const out: FreeBusyInterval[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const last = out[out.length - 1];
    if (Date.parse(cur.start) <= Date.parse(last.end)) {
      if (Date.parse(cur.end) > Date.parse(last.end)) last.end = cur.end;
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}

/**
 * Fetch free/busy. Without accessToken → oauth_missing (honest fail-closed).
 * With token → calls Google Calendar freeBusy API.
 */
export async function fetchConciergeFreeBusy(
  query: FreeBusyQuery,
  fetchImpl: typeof fetch = fetch,
): Promise<FreeBusyResult> {
  const window = validateFreeBusyWindow(query.timeMin, query.timeMax);
  if (!window.ok) return { ok: false, reason: "invalid_window" };

  if (!query.agencyId.trim()) {
    return { ok: false, reason: "upstream_error", detail: "agency_id required" };
  }

  if (!query.accessToken?.trim()) {
    return { ok: false, reason: "oauth_missing" };
  }

  try {
    const res = await fetchImpl(
      "https://www.googleapis.com/calendar/v3/freeBusy",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${query.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeMin: query.timeMin,
          timeMax: query.timeMax,
          items: [{ id: query.calendarId }],
        }),
      },
    );
    if (!res.ok) {
      return {
        ok: false,
        reason: "upstream_error",
        detail: `google_${res.status}`,
      };
    }
    const json = (await res.json()) as {
      calendars?: Record<string, { busy?: FreeBusyInterval[] }>;
    };
    const busy = mergeBusyIntervals(
      json.calendars?.[query.calendarId]?.busy ?? [],
    );
    return { ok: true, busy, calendarId: query.calendarId };
  } catch (err) {
    return {
      ok: false,
      reason: "upstream_error",
      detail: err instanceof Error ? err.message : "fetch_failed",
    };
  }
}
