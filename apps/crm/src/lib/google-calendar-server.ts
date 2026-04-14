import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  buildGoogleCalendarTemplateUrl,
  parseViewingNoteParts,
  type ParsedViewingParts,
} from "@/lib/google-calendar-url";

type TokenRow = {
  refresh_token: string;
  access_token: string | null;
  access_expires_at: string | null;
};

export async function saveGoogleCalendarTokens(
  profileId: string,
  tokens: {
    refresh_token?: string;
    access_token: string;
    expires_in?: number;
  }
): Promise<boolean> {
  const sb = createServiceRoleClient();
  if (!sb) return false;

  let refresh = tokens.refresh_token;
  if (!refresh) {
    const { data } = await sb
      .from("profile_google_calendar")
      .select("refresh_token")
      .eq("profile_id", profileId)
      .maybeSingle();
    refresh = (data as { refresh_token?: string } | null)?.refresh_token;
  }
  if (!refresh) {
    console.warn("google oauth: missing refresh_token (need prompt=consent)");
    return false;
  }

  const expiresAt =
    typeof tokens.expires_in === "number"
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

  const { error } = await sb.from("profile_google_calendar").upsert(
    {
      profile_id: profileId,
      refresh_token: refresh,
      access_token: tokens.access_token,
      access_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id" }
  );

  if (error) {
    console.error("saveGoogleCalendarTokens:", error.message);
    return false;
  }
  return true;
}

async function loadTokenRow(profileId: string): Promise<TokenRow | null> {
  const sb = createServiceRoleClient();
  if (!sb) return null;

  const { data, error } = await sb
    .from("profile_google_calendar")
    .select("refresh_token, access_token, access_expires_at")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error || !data) return null;
  return data as TokenRow;
}

async function persistAccessUpdate(
  profileId: string,
  access_token: string,
  expires_in?: number
): Promise<void> {
  const sb = createServiceRoleClient();
  if (!sb) return;

  const expiresAt =
    typeof expires_in === "number"
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null;

  await sb
    .from("profile_google_calendar")
    .update({
      access_token,
      access_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", profileId);
}

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in?: number;
} | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!data.access_token) {
    console.warn("Google refresh failed:", data.error);
    return null;
  }
  return { access_token: data.access_token, expires_in: data.expires_in };
}

export async function getGoogleCalendarAccessToken(profileId: string): Promise<string | null> {
  const row = await loadTokenRow(profileId);
  if (!row) return null;

  const expires = row.access_expires_at ? new Date(row.access_expires_at).getTime() : 0;
  const freshEnough = row.access_token && expires > Date.now() + 120_000;
  if (freshEnough) return row.access_token;

  const refreshed = await refreshAccessToken(row.refresh_token);
  if (!refreshed) return null;

  await persistAccessUpdate(profileId, refreshed.access_token, refreshed.expires_in);
  return refreshed.access_token;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function buildGoogleReminderEventBody(
  parts: ParsedViewingParts,
  leadName: string,
  fullNote: string
) {
  const y = parts.year;
  const m = pad2(parts.month);
  const d = pad2(parts.day);
  const summary = parts.viewingTimeLabel
    ? `Pripomienka: ${leadName} – obhliadka ${parts.viewingTimeLabel}`
    : `Pripomienka: ${leadName} – obhliadka`;

  return {
    summary,
    description: fullNote,
    start: {
      dateTime: `${y}-${m}-${d}T08:00:00`,
      timeZone: "Europe/Bratislava",
    },
    end: {
      dateTime: `${y}-${m}-${d}T08:25:00`,
      timeZone: "Europe/Bratislava",
    },
  };
}

export type CalendarReminderResult =
  | { kind: "created"; eventId?: string }
  | { kind: "fallback"; url: string }
  | { kind: "none" };

/** Dátum a čas obhliadky berie z textu poznámky makléra (nie je pevný). */
export async function tryCreateReminderFromNote(opts: {
  profileId: string;
  leadName: string;
  note: string;
}): Promise<CalendarReminderResult> {
  const parts = parseViewingNoteParts(opts.note);
  if (!parts) return { kind: "none" };

  const access = await getGoogleCalendarAccessToken(opts.profileId);
  const body = buildGoogleReminderEventBody(parts, opts.leadName, opts.note);

  if (!access) {
    const start = new Date(parts.year, parts.month - 1, parts.day, 8, 0, 0, 0);
    const end = new Date(parts.year, parts.month - 1, parts.day, 8, 25, 0, 0);
    const url = buildGoogleCalendarTemplateUrl({
      title: body.summary,
      details: opts.note,
      start,
      end,
    });
    return { kind: "fallback", url };
  }

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.warn("Calendar API create event failed:", res.status, err);
    const start = new Date(parts.year, parts.month - 1, parts.day, 8, 0, 0, 0);
    const end = new Date(parts.year, parts.month - 1, parts.day, 8, 25, 0, 0);
    const url = buildGoogleCalendarTemplateUrl({
      title: body.summary,
      details: opts.note,
      start,
      end,
    });
    return { kind: "fallback", url };
  }

  const data = (await res.json()) as { id?: string };
  return { kind: "created", eventId: data.id };
}
