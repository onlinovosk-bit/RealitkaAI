"use client";

import type { UserRole } from "@/lib/navigation";
import ModernSidebar from "@/components/navigation/Sidebar";
import { normalizeTier, type Tier } from "@/lib/constants/navigation";

export default function Sidebar({
  role,
  accountTier,
}: {
  role: UserRole;
  accountTier?: string | null;
}) {
  const resolved: Tier = normalizeTier(accountTier ?? (role === "owner" ? "market_vision" : "active_force"));
  return <ModernSidebar currentTier={resolved} />;
}
