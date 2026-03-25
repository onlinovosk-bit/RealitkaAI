declare global {
  // eslint-disable-next-line no-var
  var sendRetentionNotification: (userId: string, message: string) => Promise<any>;
  // eslint-disable-next-line no-var
  var sendActivityNotification: (userId: string, message: string) => Promise<any>;
}
// Notification system for user retention and activity
// Location: src/lib/notification-store.ts

import { createActivity } from './activities-store';
import { getCurrentProfile } from './auth';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'retention' | 'activity';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  meta?: Record<string, any>;
}

// In-memory store for demo; replace with DB in production
export const notifications: Notification[] = [];

export async function sendNotification({
  userId,
  type,
  title,
  message,
  meta = {}
}: Omit<Notification, 'id' | 'createdAt' | 'read'> & { meta?: Record<string, any> }) {
  const notification: Notification = {
    id: crypto.randomUUID(),
    userId,
    type,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
    meta
  };
  notifications.push(notification);
  // Log as activity for retention/engagement analytics
  await createActivity({
    profileId: userId,
    type: 'Notifikácia',
    title,
    text: message,
    entityType: 'profile',
    actorName: 'System',
    source: type === 'retention' ? 'retention' : 'activity',
    severity: type,
    meta
  });
  return notification;
}

export function listNotifications(userId: string): Notification[] {
  return notifications.filter(n => n.userId === userId);
}

export function markNotificationRead(id: string) {
  const notif = notifications.find(n => n.id === id);
  if (notif) notif.read = true;
}

// Example: send retention notification
globalThis.sendRetentionNotification = async function(userId: string, message: string) {
  return sendNotification({
    userId,
    type: 'retention',
    title: 'Zostaň aktívny!',
    message
  });
};

// Example: send activity notification
globalThis.sendActivityNotification = async function(userId: string, message: string) {
  return sendNotification({
    userId,
    type: 'activity',
    title: 'Nová aktivita',
    message
  });
};
