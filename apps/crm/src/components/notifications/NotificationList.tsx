"use client";
// NotificationList.tsx
// Simple notification UI component for user retention and activity
import React, { useEffect, useState } from 'react';
import { listNotifications, markNotificationRead, Notification } from '../../lib/notification-store';

interface NotificationListProps {
  userId: string;
}

const typeColors: Record<string, string> = {
  info: 'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  retention: 'bg-purple-100 text-purple-800',
  activity: 'bg-gray-100 text-gray-800',
};

export default function NotificationList({ userId }: NotificationListProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    setNotifications(listNotifications(userId));
    // Optionally, poll or subscribe for real-time updates
  }, [userId]);

  const handleRead = (id: string) => {
    markNotificationRead(id);
    setNotifications([...listNotifications(userId)]);
  };

  if (!notifications.length) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-96 max-w-full space-y-3">
      {notifications.filter(n => !n.read).map((n) => (
        <div
          key={n.id}
          className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border border-gray-200 bg-white animate-fade-in`}
        >
          <div className={`flex-shrink-0 w-2 h-8 rounded-full ${typeColors[n.type] || 'bg-gray-200'}`}></div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${typeColors[n.type] || 'bg-gray-200'}`}>{n.type.toUpperCase()}</span>
              <button
                className="ml-2 text-xs text-gray-400 hover:text-gray-700"
                onClick={() => handleRead(n.id)}
                aria-label="Označiť ako prečítané"
              >
                ×
              </button>
            </div>
            <div className="font-medium text-gray-900 mt-1">{n.title}</div>
            <div className="text-sm text-gray-700 mt-1">{n.message}</div>
            <div className="text-xs text-gray-400 mt-2">{new Date(n.createdAt).toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
