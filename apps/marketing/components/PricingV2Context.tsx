'use client'

import { createContext, useContext } from 'react'
import type { PricingV2View } from '../lib/pricing-v2-view'

/**
 * Katalóg cenníka v2 pre klientské stránky (napr. zakulisie). Server (layout) ho dodá len pri zapnutom
 * PRICING_V2_ENABLED; bez providera je hodnota null a stránka ostáva v legacy podobe.
 */
const PricingV2Context = createContext<PricingV2View | null>(null)

export const PricingV2Provider = PricingV2Context.Provider

export function usePricingV2(): PricingV2View | null {
  return useContext(PricingV2Context)
}
