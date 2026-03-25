// usage-tracking.ts
// Usage tracking for data-driven decision making

import { createActivity } from './activities-store';

export type UsageEventType =
  | 'page_view'
  | 'button_click'
  | 'feature_use'
  | 'notification_interaction'
  | 'custom';

export interface UsageEvent {
  userId: string;
  eventType: UsageEventType;
  eventName: string;
  details?: Record<string, any>;
  createdAt?: string;
}

export async function trackUsage(event: UsageEvent) {
  await createActivity({
    profileId: event.userId,
    type: 'Usage',
    title: event.eventName,
    text: JSON.stringify(event.details || {}),
    entityType: 'profile',
    actorName: 'UsageTracker',
    source: 'usage',
    severity: 'info',
    meta: event.details || {},
  });
}

// Helper for common events
export async function trackPageView(userId: string, page: string) {
  return trackUsage({ userId, eventType: 'page_view', eventName: page });
}

export async function trackButtonClick(userId: string, button: string, details?: Record<string, any>) {
  return trackUsage({ userId, eventType: 'button_click', eventName: button, details });
}

export async function trackFeatureUse(userId: string, feature: string, details?: Record<string, any>) {
  return trackUsage({ userId, eventType: 'feature_use', eventName: feature, details });
}

export async function trackNotificationInteraction(userId: string, notificationId: string, action: string) {
  return trackUsage({ userId, eventType: 'notification_interaction', eventName: action, details: { notificationId } });
}
