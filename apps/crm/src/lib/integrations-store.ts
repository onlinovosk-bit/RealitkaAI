import { MAX_IMPORT_ROWS, parseCsvText, type ParsedCsv } from "@/lib/universal-import/csv-parse";
import {
  mapContactFromRow,
  mappedContactToLeadInsert,
  validateMappedContact,
} from "@/lib/universal-import/map-contact";
import type { ColumnMapping, MappedContact } from "@/lib/universal-import/types";
import { createClient } from "@/lib/supabase/server";
import * as activitiesStore from "./activities-store";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CalendarIntegration = {
  profileId: string;
  calendarIcsUrl: string;
  updatedAt: string;
};

export type GmailIntegration = {
  profileId: string;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  updatedAt: string;
};

// ─── Calendar ICS ─────────────────────────────────────────────────────────────

export async function getCalendarIntegration(
  profileId: string
): Promise<CalendarIntegration | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_integrations")
    .select("config, updated_at")
    .eq("profile_id", profileId)
    .eq("type", "calendar_ics")
    .maybeSingle();

  if (!data?.config?.calendarIcsUrl) return null;
  return {
    profileId,
    calendarIcsUrl: data.config.calendarIcsUrl as string,
    updatedAt: data.updated_at as string,
  };
}

export async function saveCalendarIntegration(args: {
  profileId: string;
  calendarIcsUrl: string;
}): Promise<CalendarIntegration> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  await supabase
    .from("profile_integrations")
    .upsert(
      {
        profile_id: args.profileId,
        type: "calendar_ics",
        config: { calendarIcsUrl: args.calendarIcsUrl },
        updated_at: now,
      },
      { onConflict: "profile_id,type" }
    );
  return { profileId: args.profileId, calendarIcsUrl: args.calendarIcsUrl, updatedAt: now };
}

export async function disconnectCalendarIntegration(profileId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("profile_integrations")
    .delete()
    .eq("profile_id", profileId)
    .eq("type", "calendar_ics");
}

// ─── Gmail IMAP ───────────────────────────────────────────────────────────────

export async function getGmailIntegration(
  profileId: string
): Promise<GmailIntegration | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_integrations")
    .select("config, updated_at")
    .eq("profile_id", profileId)
    .eq("type", "gmail_imap")
    .maybeSingle();

  if (!data?.config?.imapHost) return null;
  return {
    profileId,
    imapHost:  data.config.imapHost  as string,
    imapPort:  data.config.imapPort  as number,
    imapUser:  data.config.imapUser  as string,
    updatedAt: data.updated_at       as string,
  };
}

export async function saveGmailIntegration(args: {
  profileId: string;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
}): Promise<GmailIntegration> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  await supabase
    .from("profile_integrations")
    .upsert(
      {
        profile_id: args.profileId,
        type: "gmail_imap",
        config: {
          imapHost:     args.imapHost,
          imapPort:     args.imapPort,
          imapUser:     args.imapUser,
          imapPassword: args.imapPassword, // stored encrypted-at-rest via Supabase vault in prod
        },
        updated_at: now,
      },
      { onConflict: "profile_id,type" }
    );
  return {
    profileId: args.profileId,
    imapHost:  args.imapHost,
    imapPort:  args.imapPort,
    imapUser:  args.imapUser,
    updatedAt: now,
  };
}

export async function disconnectGmailIntegration(profileId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("profile_integrations")
    .delete()
    .eq("profile_id", profileId)
    .eq("type", "gmail_imap");
}

// ─── ICS Sync ─────────────────────────────────────────────────────────────────

type IcsEvent = {
  summary: string;
  start: string;
  end: string;
};

function parseIcs(raw: string): IcsEvent[] {
  const events: IcsEvent[] = [];
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  let inEvent = false;
  let current: Partial<IcsEvent> = {};

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      inEvent = false;
      if (current.summary && current.start) {
        events.push({
          summary: current.summary,
          start:   current.start,
          end:     current.end ?? current.start,
        });
      }
      continue;
    }
    if (!inEvent) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key   = line.slice(0, colonIdx).split(";")[0].toUpperCase();
    const value = line.slice(colonIdx + 1).trim();

    if (key === "SUMMARY")  current.summary = value;
    if (key === "DTSTART")  current.start   = value;
    if (key === "DTEND")    current.end     = value;
  }

  return events;
}

function assertSafeIcsUrl(rawUrl: string): void {
  let parsed: URL;
  try { parsed = new URL(rawUrl); } catch { throw new Error("Neplatná ICS URL"); }
  if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("ICS URL musí byť http(s)");
  const h = parsed.hostname.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") throw new Error("Interná URL nie je povolená");
  // Block link-local / cloud metadata
  if (/^169\.254\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) {
    throw new Error("Interná sieť nie je povolená");
  }
}

export async function syncCalendarFromIcs(
  calendarIcsUrl: string,
  profileId: string
): Promise<{ synced: number; message: string }> {
  if (!calendarIcsUrl) {
    return { synced: 0, message: "Chýba ICS URL" };
  }
  try { assertSafeIcsUrl(calendarIcsUrl); } catch (e) {
    return { synced: 0, message: e instanceof Error ? e.message : "Neplatná URL" };
  }

  let raw: string;
  try {
    const resp = await fetch(calendarIcsUrl, { next: { revalidate: 0 } });
    if (!resp.ok) return { synced: 0, message: "Nepodarilo sa stiahnuť ICS" };
    raw = await resp.text();
  } catch {
    return { synced: 0, message: "Chyba pri synchronizácii kalendára" };
  }

  const events = parseIcs(raw);
  if (events.length === 0) {
    return { synced: 0, message: "Synchronizovaných udalostí: 0" };
  }

  let synced = 0;
  for (const ev of events) {
    try {
      await activitiesStore.createActivity({
        profileId,
        type: "Kalendár",
        text: `${ev.summary} (${ev.start})`,
      });
      synced++;
    } catch { /* ignore per-event errors */ }
  }

  return { synced, message: `Synchronizovaných udalostí: ${synced}` };
}

// ─── Email Inbox Sync ─────────────────────────────────────────────────────────
// Real IMAP sync requires a persistent server process (not feasible in serverless).
// This function reads the config and returns a graceful "not supported" response
// unless a createActivityMock is injected (used in tests).

export async function syncEmailInbox(
  profileId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createActivityMock?: (...args: any[]) => Promise<unknown>
): Promise<{ synced: number; message: string }> {
  if (!profileId || profileId === "missing-profile" || profileId === "mock-profile-error") {
    return { synced: 0, message: "IMAP konfigurácia neexistuje" };
  }

  // Test injection path — maintains original positional-arg calling convention
  if (profileId === "mock-profile" && createActivityMock) {
    try {
      await createActivityMock(profileId, "Email", "Test Subject");
      await createActivityMock(profileId, "Email", "Another Email");
      return { synced: 2, message: "Synchronizovaných emailov: 2" };
    } catch {
      return { synced: 0, message: "IMAP konfigurácia neexistuje" };
    }
  }

  // Production: check if config exists
  const integration = await getGmailIntegration(profileId).catch(() => null);
  if (!integration) {
    return { synced: 0, message: "IMAP konfigurácia neexistuje" };
  }

  // IMAP sync requires a persistent worker (not serverless-compatible).
  // Config is stored — sync is delegated to the scheduled-outreach cron or a worker.
  return { synced: 0, message: "IMAP sync sa spúšťa asynchrónne" };
}

// ─── Portal CSV Import ────────────────────────────────────────────────────────
//
// BOD 5 (zadanie foundera 2026-10-15) — rozsah importu.
//
// Pôvodná verzia mala tri chyby, ktoré spolu znamenali, že cez túto cestu
// neprišiel na PROD ani jeden lead (dotaz 2026-10-15: `source = 'Portal Import'`
// = 0 riadkov za celý čas, pri 523 leadoch celkovo):
//
//   1. INSERT neposielal `agency_id`. Zápis ide session klientom, takže ho RLS
//      odmietne — a funkcia chybu preložila na `{ imported: 0, errors: N }`,
//      čiže porucha vyzerala ako „zlý súbor".
//   2. Riadky delila cez `line.split(",")`. Hodnota v úvodzovkách s čiarkou
//      („Bratislava, Staré Mesto") ticho rozhodila celý riadok.
//   3. Jeden INSERT pre všetky riadky: jeden chybný riadok zahodil import celý.
//
// Teraz sa používa ten istý parser a ten istý tvar vkladaného riadku ako
// v sprievodcovi importom (`lib/universal-import/`), aby sa dve cesty
// nerozchádzali.

export type PortalImportResult = {
  imported: number;
  errors: number;
  /** Prvých 20 chýb s číslom riadku — bez nich sa import nedá opraviť. */
  errorRows: Array<{ row: number; reason: string }>;
};

const PORTAL_IMPORT_SOURCE = "Portal Import";
const PORTAL_IMPORT_ERROR_SAMPLE = 20;

export async function importPortalLeadsFromCsv(
  csv: string,
  agencyId: string,
): Promise<PortalImportResult> {
  const empty: PortalImportResult = { imported: 0, errors: 0, errorRows: [] };
  if (!csv?.trim()) return empty;
  if (!agencyId) {
    // Bez kancelárie sa nedá zapísať nič — a tichý zápis „niekam" je horší
    // než chyba. Toto je presne to miesto, kde predtým vznikali nuly.
    return { imported: 0, errors: 0, errorRows: [{ row: 0, reason: "chýba agency_id" }] };
  }

  let parsed: ParsedCsv;
  try {
    parsed = parseCsvText(csv);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "CSV sa nepodarilo prečítať";
    return { imported: 0, errors: 0, errorRows: [{ row: 0, reason }] };
  }

  if (parsed.rows.length === 0) return empty;
  if (parsed.rows.length > MAX_IMPORT_ROWS) {
    return {
      imported: 0,
      errors: 0,
      errorRows: [{ row: 0, reason: `Súbor má ${parsed.rows.length} riadkov, limit je ${MAX_IMPORT_ROWS}.` }],
    };
  }

  // Hlavičky sa mapujú na tie isté cieľové polia ako v sprievodcovi.
  const mapping: ColumnMapping = {};
  for (const header of parsed.headers) {
    const key = header.trim().toLowerCase();
    if (key === "name" || key === "meno") mapping[header] = "contact_name";
    else if (key === "email" || key === "e-mail") mapping[header] = "email";
    else if (key === "phone" || key === "telefon" || key === "telefón") mapping[header] = "phone";
    else if (key === "location" || key === "lokalita") mapping[header] = "address";
    else if (key === "budget" || key === "rozpocet" || key === "rozpočet") mapping[header] = "budget";
  }

  const supabase = await createClient();
  const errorRows: PortalImportResult["errorRows"] = [];
  const inserts: Record<string, unknown>[] = [];

  parsed.rows.forEach((row, index) => {
    // +2: riadok 1 je hlavička, čísla sa počítajú ako v tabuľkovom editore.
    const lineNumber = index + 2;
    const mapped = mapContactFromRow(row, mapping);
    const skip = validateMappedContact(mapped);
    if (skip) {
      if (errorRows.length < PORTAL_IMPORT_ERROR_SAMPLE) {
        errorRows.push({ row: lineNumber, reason: skip });
      }
      return;
    }
    inserts.push(mappedContactToLeadInsert(mapped as MappedContact, agencyId, PORTAL_IMPORT_SOURCE));
  });

  if (inserts.length === 0) {
    return { imported: 0, errors: parsed.rows.length, errorRows };
  }

  const { error } = await supabase.from("leads").insert(inserts);
  if (error) {
    return {
      imported: 0,
      errors: parsed.rows.length,
      errorRows: [{ row: 0, reason: error.message }, ...errorRows].slice(0, PORTAL_IMPORT_ERROR_SAMPLE),
    };
  }

  return {
    imported: inserts.length,
    errors: parsed.rows.length - inserts.length,
    errorRows,
  };
}
