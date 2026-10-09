"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PricingV2Catalog } from "@/lib/pricing-v2";

/**
 * Prenos katalógu cenníka v2 zo server komponentu ku klientskym komponentom (bez čítania env v prehliadači).
 * Bez providera (alebo s `catalog={null}`) sa komponenty správajú presne ako pred W2-D.
 */
const PricingV2Context = createContext<PricingV2Catalog | null>(null);

export function PricingV2Provider({ catalog, children }: { catalog: PricingV2Catalog | null; children: ReactNode }) {
  return <PricingV2Context.Provider value={catalog}>{children}</PricingV2Context.Provider>;
}

export function usePricingV2Catalog(): PricingV2Catalog | null {
  return useContext(PricingV2Context);
}
