"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { trackUpgradeIntent } from "@/lib/license/upgrade-analytics";
import type { LicenseCapability } from "@/lib/license/types";
import { getCapabilityDefinition, LICENSE_PROGRAMS } from "@/lib/license/capability-registry";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

type PremiumLockedOverlayProps = {
  capability: LicenseCapability;
  headline?: string;
  subline?: string;
  ctaLabel?: string;
  blurClassName?: string;
  onUpgradeClick?: () => void;
};

export function PremiumLockedOverlay({
  capability,
  headline,
  subline,
  ctaLabel,
  blurClassName = "blur-[5px] saturate-50",
  onUpgradeClick,
}: PremiumLockedOverlayProps) {
  const def = getCapabilityDefinition(capability);
  const program = LICENSE_PROGRAMS[def.upgradeProgram];
  const regionLabel = `Premium funkcia — ${program.displayName}`;

  function handleView() {
    void trackUpgradeIntent(def.revenueTrigger, {
      capability,
      surface: "premium_locked_overlay",
    });
  }

  function handleCtaClick() {
    void trackUpgradeIntent("upgrade_cta_click", {
      capability,
      targetProgram: def.upgradeProgram,
      surface: "premium_locked_overlay",
    });
    onUpgradeClick?.();
  }

  return (
    <div
      role="region"
      aria-label={regionLabel}
      className="absolute inset-0 z-30 flex items-center justify-center p-6 motion-reduce:backdrop-blur-none"
      style={{ background: "rgba(248,250,252,0.72)", backdropFilter: "blur(3px)" }}
      onMouseEnter={handleView}
    >
      <div
        className="max-w-md rounded-2xl border p-5 text-center"
        style={{
          background: WORKDESK_CARD.background,
          borderColor: SLATE_HORIZON.softBorder,
          boxShadow: `${WORKDESK_CARD.boxShadow}, 0 0 40px rgba(37,99,235,0.12)`,
        }}
      >
        <div className="mb-2 flex items-center justify-center gap-2">
          <Lock className="h-4 w-4" style={{ color: SLATE_HORIZON.brandDeep }} aria-hidden />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: SLATE_HORIZON.brandDeep }}>
            {program.displayName} · {program.psychology}
          </p>
        </div>
        <p className="text-sm font-semibold" style={{ color: SLATE_HORIZON.ink }}>
          {headline ?? def.teaser}
        </p>
        <p className="mt-2 text-xs" style={{ color: SLATE_HORIZON.muted }}>
          {subline ?? `Dostupné v programe ${program.billingLabel}. ${program.feeling}.`}
        </p>
        <a
          href="/billing"
          onClick={handleCtaClick}
          className={`mt-4 inline-flex min-h-[44px] cursor-pointer items-center rounded-xl px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-white transition-opacity duration-200 hover:opacity-90 ${SLATE_HORIZON.focusRing}`}
          style={{ background: SLATE_HORIZON.brandDeep }}
        >
          {ctaLabel ?? def.upgradeCta}
        </a>
        <a
          href="/porovnanie-programov"
          className={`mt-2 block cursor-pointer text-[10px] font-semibold transition-opacity duration-200 hover:opacity-80 ${SLATE_HORIZON.focusRing}`}
          style={{ color: SLATE_HORIZON.brandDeep }}
        >
          Porovnať programy →
        </a>
      </div>
    </div>
  );
}

export function PremiumLockedBlur({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div className={active ? "motion-reduce:opacity-60 motion-reduce:blur-none blur-[5px] saturate-50" : undefined}>
      {children}
    </div>
  );
}
