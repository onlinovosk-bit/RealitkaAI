"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PricingV2Catalog } from "@/lib/pricing-v2";

/**
 * Prenos katalógu cenníka z server komponentu ku klientskym komponentom (bez čítania env v prehliadači).
 *
 * Tri stavy:
 *  - bez providera (`undefined`) = verejný web: žiadna suma („Cenu vám pošleme na vyžiadanie“),
 *  - provider s `catalog={null}` = prihlásená aplikácia s pôvodným (legacy) cenníkom,
 *  - provider s katalógom = cenník v3.
 * Dashboard layout vždy obalí aplikáciu providerom, verejné stránky ho nemajú.
 */
const PricingV2Context = createContext<PricingV2Catalog | null | undefined>(undefined);

export function PricingV2Provider({ catalog, children }: { catalog: PricingV2Catalog | null; children: ReactNode }) {
  return <PricingV2Context.Provider value={catalog}>{children}</PricingV2Context.Provider>;
}

export function usePricingV2Catalog(): PricingV2Catalog | null {
  return useContext(PricingV2Context) ?? null;
}

/** true = verejný kontext bez providera: komponent nesmie zobraziť žiadnu sumu. */
export function usePricingHidden(): boolean {
  return useContext(PricingV2Context) === undefined;
}
