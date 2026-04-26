"use client";

import { useEffect, useState, type ReactNode } from "react";
import Sidebar from "@/components/layout/sidebar";
import SpaceHeader from "@/components/layout/SpaceHeader";
import SpaceBackground from "@/components/space/SpaceBackground";
import type { UserRole } from "@/lib/navigation";
import DashboardClientShell from "./DashboardClientShell";

type Props = {
  userName: string;
  role: UserRole;
  accountTier?: string | null;
  children: ReactNode;
};

/**
 * Prvý SSR + hydratačný paint musí byť deterministický.
 * Celý „živý“ chrome (Zustand, čas, atď.) sa vykreslí až po mounte klienta — žiadny #418 / #185 z nezhody server vs klient.
 */
export default function DashboardClientLayout({ userName, role, accountTier, children }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="relative flex min-h-screen bg-[#080c1c]">
        <div
          className="hidden shrink-0 md:block md:w-64"
          style={{ position: "relative", zIndex: 1 }}
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 flex-col" style={{ position: "relative", zIndex: 1 }}>
          <div className="h-[57px] border-b border-indigo-500/15 bg-[rgba(8,12,28,0.85)]" />
          <div className="flex-1 p-6">
            <p className="text-center text-sm text-gray-500">Načítavam…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[#080c1c]">
      <div className="relative flex min-h-0 flex-1">
        <SpaceBackground />
        <div className="hidden md:block" style={{ position: "relative", zIndex: 1 }}>
          <Sidebar role={role} accountTier={accountTier} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col" style={{ position: "relative", zIndex: 1 }}>
          <SpaceHeader userName={userName} />
          <DashboardClientShell>{children}</DashboardClientShell>
        </div>
      </div>
    </div>
  );
}
