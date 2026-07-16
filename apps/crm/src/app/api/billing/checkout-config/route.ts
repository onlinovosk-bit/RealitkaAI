import { okResponse } from "@/lib/api-response";
import {
  SEAT_TIER_CONFIG,
  SEAT_TIERS,
  TOPUP_PACKAGES,
  TOPUP_PACKAGE_KEYS,
  areSeatCheckoutPricesConfigured,
  areTopupCheckoutPricesConfigured,
  cockpitLiteEligible,
  founderKancelarieRemaining,
  isFounderKancelariaEligible,
  ownerCockpitPriceEur,
  type SeatTier,
} from "@/lib/program-tier-pricing";

export async function GET() {
  const seatCheckoutAvailable = areSeatCheckoutPricesConfigured();
  const topupCheckoutAvailable = areTopupCheckoutPricesConfigured();

  return okResponse({
    seatCheckoutAvailable,
    topupCheckoutAvailable,
    checkoutAvailable: seatCheckoutAvailable || topupCheckoutAvailable,
    founderCockpitEligible: isFounderKancelariaEligible(),
    founderCockpitRemaining: founderKancelarieRemaining(),
    seatTiers: SEAT_TIERS.map((tier: SeatTier) => ({
      key: tier,
      label: SEAT_TIER_CONFIG[tier].label,
      priceEur: SEAT_TIER_CONFIG[tier].priceEur,
      minSeats: SEAT_TIER_CONFIG[tier].minSeats,
      defaultSeats: SEAT_TIER_CONFIG[tier].defaultSeats,
      monthlyGrantPerSeat: SEAT_TIER_CONFIG[tier].monthlyGrantPerSeat,
    })),
    cockpit: {
      liteMinSeats: 3,
      ownerPriceEur: ownerCockpitPriceEur({ founderEligible: false }),
      ownerFounderPriceEur: ownerCockpitPriceEur({ founderEligible: true }),
      cockpitLiteEligible,
    },
    topupPackages: TOPUP_PACKAGE_KEYS.map((key) => TOPUP_PACKAGES[key]),
  });
}
