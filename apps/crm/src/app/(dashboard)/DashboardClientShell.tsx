"use client";
import DemoNotificationTrigger from "@/components/notifications/DemoNotificationTrigger";
import React from "react";

export default function DashboardClientShell({ userId, children }: { userId: string, children: React.ReactNode }) {
  return (
    <>
      <DemoNotificationTrigger userId={userId} />
      {children}
    </>
  );
}