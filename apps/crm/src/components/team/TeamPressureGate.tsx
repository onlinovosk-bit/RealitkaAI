"use client";

import type { ReactNode } from "react";
import { PremiumLockedBlur, PremiumLockedOverlay } from "@/components/license/PremiumLockedOverlay";

type TeamPressureGateProps = {
  canAccess: boolean;
  children: ReactNode;
  className?: string;
};

/** Guardian-tier gate for Owner Pressure View surfaces on /team. */
export function TeamPressureGate({ canAccess, children, className }: TeamPressureGateProps) {
  return (
    <div className={className ? `relative ${className}` : "relative"}>
      <PremiumLockedBlur active={!canAccess}>{children}</PremiumLockedBlur>
      {!canAccess ? (
        <PremiumLockedOverlay
          capability="canAccessTeamPressure"
          headline="Tlak na tím podľa revenue, nie dojmov."
          subline="Owner Pressure View ukáže, ktorý maklér dnes stráca províziu — aktivuj Market Vision."
        />
      ) : null}
    </div>
  );
}
