export interface DomainEvent<TPayload = unknown> {
  readonly eventId: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly eventType: string;
  readonly payload: TPayload;
  readonly occurredAt: Date;
  readonly version: number;
}

export type EventHandler<T extends DomainEvent = DomainEvent> = (
  event: T
) => Promise<void> | void;
