import type { SupabaseClient } from "@supabase/supabase-js";
import type { DomainEvent } from "@/domain/shared/Event";
import { randomUUID } from "crypto";

interface EventRow {
  id: string;
  aggregate_id: string;
  aggregate_type: string;
  event_type: string;
  payload: unknown;
  version: number;
  occurred_at: string;
}

export class EventStore {
  constructor(private readonly supabase: SupabaseClient) {}

  async append(event: DomainEvent): Promise<void> {
    const { error } = await this.supabase.from("event_store").insert({
      id: event.eventId ?? randomUUID(),
      aggregate_id: event.aggregateId,
      aggregate_type: event.aggregateType,
      event_type: event.eventType,
      payload: event.payload,
      version: event.version ?? 1,
      occurred_at: event.occurredAt.toISOString(),
    });
    if (error) throw new Error(`[EventStore] append failed: ${error.message}`);
  }

  async getEvents(aggregateId: string): Promise<DomainEvent[]> {
    const { data, error } = await this.supabase
      .from("event_store")
      .select("*")
      .eq("aggregate_id", aggregateId)
      .order("version", { ascending: true });

    if (error) throw new Error(`[EventStore] getEvents failed: ${error.message}`);
    return (data as EventRow[]).map(mapRowToEvent);
  }

  async getEventsByType(eventType: string, limit = 100): Promise<DomainEvent[]> {
    const { data, error } = await this.supabase
      .from("event_store")
      .select("*")
      .eq("event_type", eventType)
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`[EventStore] getEventsByType failed: ${error.message}`);
    return (data as EventRow[]).map(mapRowToEvent);
  }
}

function mapRowToEvent(row: EventRow): DomainEvent {
  return {
    eventId: row.id,
    aggregateId: row.aggregate_id,
    aggregateType: row.aggregate_type,
    eventType: row.event_type,
    payload: row.payload,
    version: row.version,
    occurredAt: new Date(row.occurred_at),
  };
}
