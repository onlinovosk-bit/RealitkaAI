"use client";

import { useEffect, useState } from "react";
import type { PricingV2ConfigPayload } from "@/lib/pricing-v2-contract";

/**
 * Z odpovede `GET /api/billing/checkout-config` vráti `pricingV2` LEN ak je výslovne zapnuté
 * (`enabled === true`) a katalóg je prítomný. Všetko ostatné (chýbajúce pole, `false`, chyba) = null = legacy.
 */
export function readPricingV2Config(raw: unknown): PricingV2ConfigPayload | null {
  if (typeof raw !== "object" || raw === null) return null;
  const p = (raw as { pricingV2?: unknown }).pricingV2;
  if (typeof p !== "object" || p === null) return null;
  const c = p as Partial<PricingV2ConfigPayload>;
  if (c.enabled !== true || !c.catalog || !Array.isArray(c.catalog.bands) || !Array.isArray(c.catalog.packs)) {
    return null;
  }
  return {
    enabled: true,
    checkoutAvailable: c.checkoutAvailable === true,
    missingPriceEnvKeys: Array.isArray(c.missingPriceEnvKeys) ? c.missingPriceEnvKeys : [],
    catalog: c.catalog,
    plansOnly: c.plansOnly === true,
    yearlyAvailable: c.yearlyAvailable === true,
  };
}

/** `undefined` = ešte sa načítava, `null` = legacy cenník, objekt = v2 zapnuté. */
export function usePricingV2Config(): PricingV2ConfigPayload | null | undefined {
  const [config, setConfig] = useState<PricingV2ConfigPayload | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    fetch("/api/billing/checkout-config")
      .then((r) => r.json())
      .then((d) => {
        if (active) setConfig(readPricingV2Config(d));
      })
      .catch(() => {
        if (active) setConfig(null);
      });
    return () => {
      active = false;
    };
  }, []);
  return config;
}
