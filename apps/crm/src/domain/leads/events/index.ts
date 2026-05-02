import { randomUUID } from "crypto";
import type { DomainEvent } from "@/domain/shared/Event";

// ── LeadCreated ───────────────────────────────────────────────

export interface LeadCreatedPayload {
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  agencyId: string | null;
  assignedProfileId?: string | null;
}

export interface LeadCreatedEvent extends DomainEvent<LeadCreatedPayload> {
  eventType: "LeadCreated";
  aggregateType: "Lead";
}

export function createLeadCreatedEvent(
  leadId: string,
  payload: LeadCreatedPayload
): LeadCreatedEvent {
  return {
    eventId: randomUUID(),
    aggregateId: leadId,
    aggregateType: "Lead",
    eventType: "LeadCreated",
    payload,
    occurredAt: new Date(),
    version: 1,
  };
}

// ── LeadScored ────────────────────────────────────────────────

export interface LeadScoredPayload {
  score: number;
  briScore: number;
  segment: string;
  reasons: string[];
  agencyId: string;
}

export interface LeadScoredEvent extends DomainEvent<LeadScoredPayload> {
  eventType: "LeadScored";
  aggregateType: "Lead";
}

export function createLeadScoredEvent(
  leadId: string,
  payload: LeadScoredPayload,
  version: number
): LeadScoredEvent {
  return {
    eventId: randomUUID(),
    aggregateId: leadId,
    aggregateType: "Lead",
    eventType: "LeadScored",
    payload,
    occurredAt: new Date(),
    version,
  };
}

// ── LeadStatusChanged ─────────────────────────────────────────

export interface LeadStatusChangedPayload {
  fromStatus: string;
  toStatus: string;
  agencyId: string | null;
  changedByProfileId?: string;
}

export interface LeadStatusChangedEvent
  extends DomainEvent<LeadStatusChangedPayload> {
  eventType: "LeadStatusChanged";
  aggregateType: "Lead";
}

export function createLeadStatusChangedEvent(
  leadId: string,
  payload: LeadStatusChangedPayload,
  version: number
): LeadStatusChangedEvent {
  return {
    eventId: randomUUID(),
    aggregateId: leadId,
    aggregateType: "Lead",
    eventType: "LeadStatusChanged",
    payload,
    occurredAt: new Date(),
    version,
  };
}
