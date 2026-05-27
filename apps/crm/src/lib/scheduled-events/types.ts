export const SCHEDULED_EVENT_TYPES = [
  "viewing",
  "meeting",
  "call",
  "reminder",
  "other",
] as const;

export type ScheduledEventType = (typeof SCHEDULED_EVENT_TYPES)[number];

export const SCHEDULED_EVENT_STATUSES = [
  "scheduled",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
] as const;

export type ScheduledEventStatus = (typeof SCHEDULED_EVENT_STATUSES)[number];

export type ScheduledEvent = {
  id: string;
  agencyId: string;
  profileId: string;
  leadId: string | null;
  propertyId: string | null;
  eventType: ScheduledEventType;
  status: ScheduledEventStatus;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  googleCalendarEventId: string | null;
  googleCalendarHtmlLink: string | null;
  reminderMinutes: number | null;
  meta: Record<string, unknown>;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScheduledEventInput = {
  leadId?: string | null;
  propertyId?: string | null;
  eventType?: ScheduledEventType;
  status?: ScheduledEventStatus;
  title: string;
  description?: string;
  location?: string;
  startsAt: string;
  endsAt: string;
  timezone?: string;
  reminderMinutes?: number | null;
  meta?: Record<string, unknown>;
};

export type ScheduledEventUpdateInput = Partial<ScheduledEventInput> & {
  googleCalendarEventId?: string | null;
  googleCalendarHtmlLink?: string | null;
};

export type ListScheduledEventsQuery = {
  from?: string;
  to?: string;
  leadId?: string;
  status?: ScheduledEventStatus;
  eventType?: ScheduledEventType;
  limit?: number;
};
