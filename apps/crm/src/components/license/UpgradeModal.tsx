"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { SLATE_HORIZON, WORKDESK_PANEL } from "@/lib/slate-horizon-theme";
import { getCapabilityDefinition, LICENSE_PROGRAMS } from "@/lib/license/capability-registry";
import { trackUpgradeIntent } from "@/lib/license/upgrade-analytics";
import type { LicenseCapability } from "@/lib/license/types";

type UpgradeModalProps = {
  open: boolean;
  capability: LicenseCapability;
  onClose: () => void;
};

export function UpgradeModal({ open, capability, onClose }: UpgradeModalProps) {
  const def = getCapabilityDefinition(capability);
  const program = LICENSE_PROGRAMS[def.upgradeProgram];

  useEffect(() => {
    if (!open) return;
    void trackUpgradeIntent("upgrade_modal_open", { capability, targetProgram: def.upgradeProgram });
  }, [open, capability, def.upgradeProgram]);

  if (!open) return null;

  function handleDismiss() {
    void trackUpgradeIntent("upgrade_modal_dismiss", { capability });
    onClose();
  }

  function handleCta() {
    void trackUpgradeIntent("upgrade_cta_click", {
      capability,
      targetProgram: def.upgradeProgram,
      surface: "upgrade_modal",
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.45)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border p-6"
        style={{
          background: WORKDESK_PANEL.background,
          borderColor: WORKDESK_PANEL.borderColor,
          boxShadow: WORKDESK_PANEL.boxShadow,
        }}
      >
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-4 top-4 rounded-lg p-1 hover:bg-slate-100"
          aria-label="Zavrieť"
        >
          <X className="h-4 w-4" style={{ color: SLATE_HORIZON.muted }} />
        </button>

        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: SLATE_HORIZON.brandDeep }}>
          {program.displayName}
        </p>
        <h2 id="upgrade-modal-title" className="mt-2 text-xl font-bold" style={{ color: SLATE_HORIZON.ink }}>
          {def.label}
        </h2>
        <p className="mt-2 text-sm" style={{ color: SLATE_HORIZON.muted }}>
          {def.teaser}
        </p>
        <p className="mt-3 text-sm font-medium" style={{ color: SLATE_HORIZON.ink }}>
          {program.feeling}
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <a
            href="/billing"
            onClick={handleCta}
            className="inline-flex flex-1 items-center justify-center rounded-xl px-4 py-3 text-sm font-bold text-white"
            style={{ background: SLATE_HORIZON.brandDeep }}
          >
            {def.upgradeCta}
          </a>
          <a
            href="/porovnanie-programov"
            className="inline-flex flex-1 items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold"
            style={{ borderColor: SLATE_HORIZON.line, color: SLATE_HORIZON.brandDeep }}
          >
            Porovnať programy
          </a>
        </div>
      </div>
    </div>
  );
}
