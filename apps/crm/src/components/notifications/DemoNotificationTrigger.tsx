// DemoNotificationTrigger.tsx
import React from 'react';

export default function DemoNotificationTrigger({ userId }: { userId: string }) {
  const handleRetention = async () => {
    if (typeof window !== 'undefined' && globalThis.sendRetentionNotification) {
      await globalThis.sendRetentionNotification(userId, 'Vráť sa do aplikácie a získaj nové funkcie!');
    }
  };
  const handleActivity = async () => {
    if (typeof window !== 'undefined' && globalThis.sendActivityNotification) {
      await globalThis.sendActivityNotification(userId, 'Práve bola zaznamenaná nová aktivita v tvojom účte.');
    }
  };
  return (
    <div className="flex gap-2 mt-4">
      <button
        className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700"
        onClick={handleRetention}
      >
        Demo Retention Notifikácia
      </button>
      <button
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        onClick={handleActivity}
      >
        Demo Aktivita Notifikácia
      </button>
    </div>
  );
}
