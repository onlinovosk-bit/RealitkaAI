"use client";
import React from "react";

export default function DashboardClientShell({ children }: { userId?: string, children: React.ReactNode }) {
  return <>{children}</>;
}