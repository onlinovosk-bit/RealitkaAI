import type { DomainEvent, EventHandler } from "@/domain/shared/Event";

export class EventBus {
  private handlers = new Map<string, EventHandler[]>();

  on<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventType) ?? [];
    this.handlers.set(eventType, [...existing, handler as EventHandler]);
  }

  async emit(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType) ?? [];
    await Promise.all(handlers.map((h) => h(event)));
  }

  off(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) ?? [];
    this.handlers.set(
      eventType,
      existing.filter((h) => h !== handler)
    );
  }
}

// Singleton pre server-side use
export const globalEventBus = new EventBus();
