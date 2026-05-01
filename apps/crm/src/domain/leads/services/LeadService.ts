import type { LeadsRepository } from "../repositories/LeadsRepository";
import type { EventStore } from "@/infra/db/eventstore/EventStore";
import type { EventBus } from "@/infra/messaging/EventBus";
import {
  createLeadCreatedEvent,
  createLeadScoredEvent,
  createLeadStatusChangedEvent,
  type LeadCreatedPayload,
  type LeadScoredPayload,
} from "../events";
import { randomUUID } from "crypto";

export class LeadService {
  constructor(
    private readonly leadsRepo: LeadsRepository,
    private readonly eventStore: EventStore,
    private readonly eventBus: EventBus
  ) {}

  async createLead(payload: LeadCreatedPayload): Promise<string> {
    const leadId = randomUUID();
    const event = createLeadCreatedEvent(leadId, payload);

    await this.eventStore.append(event);
    await this.eventBus.emit(event);

    return leadId;
  }

  async scoreLead(
    leadId: string,
    scoringPayload: Omit<LeadScoredPayload, "agencyId">,
    agencyId: string
  ): Promise<void> {
    const lead = await this.leadsRepo.findById(leadId);
    if (!lead) throw new LeadNotFoundError(leadId);

    const events = await this.eventStore.getEvents(leadId);
    const nextVersion = events.length + 1;

    const event = createLeadScoredEvent(
      leadId,
      { ...scoringPayload, agencyId },
      nextVersion
    );

    await this.eventStore.append(event);
    await this.eventBus.emit(event);
  }

  async changeStatus(
    leadId: string,
    toStatus: string,
    agencyId: string,
    changedByProfileId?: string
  ): Promise<void> {
    const lead = await this.leadsRepo.findById(leadId);
    if (!lead) throw new LeadNotFoundError(leadId);

    const events = await this.eventStore.getEvents(leadId);
    const nextVersion = events.length + 1;

    const event = createLeadStatusChangedEvent(
      leadId,
      {
        fromStatus: lead.status ?? "Nový",
        toStatus,
        agencyId,
        changedByProfileId,
      },
      nextVersion
    );

    await this.eventStore.append(event);
    await this.eventBus.emit(event);
  }
}

export class LeadNotFoundError extends Error {
  constructor(leadId: string) {
    super(`Lead ${leadId} not found`);
    this.name = "LeadNotFoundError";
  }
}
