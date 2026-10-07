import { PRICING_V2_BANDS } from "@/lib/pricing-v2";

/**
 * `/upgrade?plan=<pásmo>` (z webu a z registrácie): počet používateľov, ktorým sa pásmo predvyberie.
 * Berie sa spodná hranica pásma (Start 1, Team 2, Kancelária 7, Sieť 26); neznáma hodnota nič nepredvyberie.
 */
export function usersForPlanParam(value: string | null | undefined): number | null {
  const band = PRICING_V2_BANDS.find((b) => b.id === value);
  return band ? band.minUsers : null;
}
