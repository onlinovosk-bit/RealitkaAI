import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveTenantSupabase } from "@/lib/supabase/resolve-client";
import type {
  ListScheduledEventsQuery,
  ScheduledEvent,
  ScheduledEventInput,
  ScheduledEventUpdateInput,
} from "./types";

type ScheduledEventRow = {
  id: string;
  agency_id: string;
  profile_id: string;
  lead_id: string | null;
  property_id: string | null;
  event_type: string;
  status: string;
  title: string;
  description: string;
  location: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  google_calendar_event_id: string | null;
  google_calendar_html_link: string | null;
  reminder_minutes: number | null;
  meta: Record<string, unknown> | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: ScheduledEventRow): ScheduledEvent {
  return {
    id: row.id,
    agencyId: row.agency_id,
    profileId: row.profile_id,
    leadId: row.lead_id,
    propertyId: row.property_id,
    eventType: row.event_type as ScheduledEvent["eventType"],
    status: row.status as ScheduledEvent["status"],
    title: row.title,
    description: row.description ?? "",
    location: row.location ?? "",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    timezone: row.timezone ?? "Europe/Bratislava",
    googleCalendarEventId: row.google_calendar_event_id,
    googleCalendarHtmlLink: row.google_calendar_html_link,
    reminderMinutes: row.reminder_minutes,
    meta: row.meta ?? {},
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getClient(
  scoped?: SupabaseClient | null,
): Promise<SupabaseClient | null> {
  return resolveTenantSupabase(scoped);
}

export async function listScheduledEvents(
  query: ListScheduledEventsQuery,
  scoped?: SupabaseClient | null,
): Promise<ScheduledEvent[]> {
  const supabase = await getClient(scoped);
  if (!supabase) return [];

  let builder = supabase
    .from("scheduled_events")
    .select("*")
    .order("starts_at", { ascending: true });

  if (query.from) builder = builder.gte("starts_at", query.from);
  if (query.to) builder = builder.lte("starts_at", query.to);
  if (query.leadId) builder = builder.eq("lead_id", query.leadId);
  if (query.status) builder = builder.eq("status", query.status);
  if (query.eventType) builder = builder.eq("event_type", query.eventType);

  const limit = query.limit ?? 100;
  builder = builder.limit(limit);

  const { data, error } = await builder;
  if (error || !data) {
    console.error("listScheduledEvents:", error?.message);
    return [];
  }

  return (data as ScheduledEventRow[]).map(mapRow);
}

export async function getScheduledEventById(
  id: string,
  scoped?: SupabaseClient | null,
): Promise<ScheduledEvent | null> {
  const supabase = await getClient(scoped);
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("scheduled_events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("getScheduledEventById:", error.message);
    return null;
  }

  return mapRow(data as ScheduledEventRow);
}

export async function createScheduledEvent(
  agencyId: string,
  profileId: string,
  input: ScheduledEventInput,
  scoped?: SupabaseClient | null,
): Promise<ScheduledEvent> {
  const supabase = await getClient(scoped);
  if (!supabase) {
    throw new Error("Databáza nie je dostupná.");
  }

  const now = new Date().toISOString();
  const status = input.status ?? "scheduled";

  const { data, error } = await supabase
    .from("scheduled_events")
    .insert({
      agency_id: agencyId,
      profile_id: profileId,
      lead_id: input.leadId ?? null,
      property_id: input.propertyId ?? null,
      event_type: input.eventType ?? "viewing",
      status,
      title: input.title,
      description: input.description ?? "",
      location: input.location ?? "",
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      timezone: input.timezone ?? "Europe/Bratislava",
      reminder_minutes: input.reminderMinutes ?? null,
      meta: input.meta ?? {},
      cancelled_at: status === "cancelled" ? now : null,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nepodarilo sa vytvoriť udalosť.");
  }

  return mapRow(data as ScheduledEventRow);
}

export async function updateScheduledEvent(
  id: string,
  patch: ScheduledEventUpdateInput,
  scoped?: SupabaseClient | null,
): Promise<ScheduledEvent> {
  const supabase = await getClient(scoped);
  if (!supabase) {
    throw new Error("Databáza nie je dostupná.");
  }

  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.location !== undefined) row.location = patch.location;
  if (patch.startsAt !== undefined) row.starts_at = patch.startsAt;
  if (patch.endsAt !== undefined) row.ends_at = patch.endsAt;
  if (patch.timezone !== undefined) row.timezone = patch.timezone;
  if (patch.eventType !== undefined) row.event_type = patch.eventType;
  if (patch.leadId !== undefined) row.lead_id = patch.leadId;
  if (patch.propertyId !== undefined) row.property_id = patch.propertyId;
  if (patch.reminderMinutes !== undefined) row.reminder_minutes = patch.reminderMinutes;
  if (patch.meta !== undefined) row.meta = patch.meta;
  if (patch.googleCalendarEventId !== undefined) {
    row.google_calendar_event_id = patch.googleCalendarEventId;
  }
  if (patch.googleCalendarHtmlLink !== undefined) {
    row.google_calendar_html_link = patch.googleCalendarHtmlLink;
  }

  if (patch.status !== undefined) {
    row.status = patch.status;
    row.cancelled_at =
      patch.status === "cancelled" ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from("scheduled_events")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nepodarilo sa upraviť udalosť.");
  }

  return mapRow(data as ScheduledEventRow);
}

export async function deleteScheduledEvent(
  id: string,
  scoped?: SupabaseClient | null,
): Promise<void> {
  const supabase = await getClient(scoped);
  if (!supabase) {
    throw new Error("Databáza nie je dostupná.");
  }

  const { error } = await supabase.from("scheduled_events").delete().eq("id", id);

  if (error) {
    throw new Error(error.message ?? "Nepodarilo sa zmazať udalosť.");
  }
}

/** Overí, že lead patrí do agency (pre WITH CHECK pred insertom). */
export async function leadBelongsToAgency(
  leadId: string,
  agencyId: string,
  scoped?: SupabaseClient | null,
): Promise<boolean> {
  const supabase = await getClient(scoped);
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("leads")
    .select("agency_id")
    .eq("id", leadId)
    .maybeSingle();

  if (error || !data) return false;
  return data.agency_id === agencyId;
}

export async function propertyBelongsToAgency(
  propertyId: string,
  agencyId: string,
  scoped?: SupabaseClient | null,
): Promise<boolean> {
  const supabase = await getClient(scoped);
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("properties")
    .select("agency_id")
    .eq("id", propertyId)
    .maybeSingle();

  if (error || !data) return false;
  return data.agency_id === agencyId;
}
