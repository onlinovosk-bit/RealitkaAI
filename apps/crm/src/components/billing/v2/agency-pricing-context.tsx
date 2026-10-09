"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AgencyPricingV2 } from "@/lib/pricing-v2-agency";

/**
 * Prenos „kancelária má v2 predplatné + pásmo“ z dashboard layoutu (server) ku klientskym stránkam.
 * Bez providera / `null` = legacy zákazník (alebo vypnutý prepínač) = pôvodné správanie.
 */
const AgencyPricingV2Context = createContext<AgencyPricingV2 | null>(null);

export function AgencyPricingV2Provider({ value, children }: { value: AgencyPricingV2 | null; children: ReactNode }) {
  return <AgencyPricingV2Context.Provider value={value}>{children}</AgencyPricingV2Context.Provider>;
}

export function useAgencyPricingV2(): AgencyPricingV2 | null {
  return useContext(AgencyPricingV2Context);
}
