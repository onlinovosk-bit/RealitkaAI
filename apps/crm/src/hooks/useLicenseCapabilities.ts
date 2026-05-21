"use client";

import { useMemo } from "react";
import {
  getCapabilityDefinition,
  getProgramForTier,
  hasCapability,
  LICENSE_PROGRAMS,
  normalizeLicenseTier,
  resolveCapabilities,
} from "@/lib/license/capability-registry";
import type { LicenseCapability, LicenseTierKey } from "@/lib/license/types";

export function useLicenseCapabilities(accountTier: string | null | undefined) {
  const tier = useMemo(() => normalizeLicenseTier(accountTier), [accountTier]);
  const program = useMemo(() => getProgramForTier(tier), [tier]);
  const programMeta = LICENSE_PROGRAMS[program];
  const capabilities = useMemo(() => resolveCapabilities(tier), [tier]);

  function can(capability: LicenseCapability): boolean {
    return hasCapability(tier, capability);
  }

  function lockedMeta(capability: LicenseCapability) {
    const def = getCapabilityDefinition(capability);
    const upgradeProgram = LICENSE_PROGRAMS[def.upgradeProgram];
    return {
      ...def,
      upgradeProgramMeta: upgradeProgram,
      currentProgram: programMeta,
      currentTier: tier as LicenseTierKey,
    };
  }

  return {
    tier,
    program,
    programMeta,
    capabilities,
    can,
    lockedMeta,
  };
}
