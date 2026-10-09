"use client";

import ProgramComparison from "@/components/billing/ProgramComparison";
import PricingV2Comparison from "./PricingV2Comparison";
import { usePricingV2Config } from "./usePricingV2Config";

/**
 * Prepínač cenníka: legacy `ProgramComparison` (nezmenený) kým/ak `pricingV2.enabled !== true`,
 * inak pásma z katalógu v2.
 */
export default function ProgramComparisonSwitch() {
  const v2 = usePricingV2Config();
  if (v2) return <PricingV2Comparison config={v2} />;
  return <ProgramComparison />;
}
