import { okResponse } from "@/lib/api-response";
import {
  SEAT_TIER_CONFIG,
  SEAT_TIERS,
  TOPUP_PACKAGES,
  TOPUP_PACKAGE_KEYS,
  MIGRATION_DFY,
  areSeatCheckoutPricesConfigured,
  areTopupCheckoutPricesConfigured,
  cockpitLiteEligible,
  founderKancelarieRemaining,
  isFounderKancelariaEligible,
  isMigrationDfyCheckoutAvailable,
  isOwnerCockpitPurchasable,
  ownerCockpitPriceEur,
  type SeatTier,
} from "@/lib/program-tier-pricing";

export async function GET() {
  const seatCheckoutAvailable = areSeatCheckoutPricesConfigured();
  const topupCheckoutAvailable = areTopupCheckoutPricesConfigured();
  const founderEligible = isFounderKancelariaEligible();

  return okResponse({
    seatCheckoutAvailable,
    topupCheckoutAvailable,
    checkoutAvailable: seatCheckoutAvailable || topupCheckoutAvailable,
    migrationDfyAvailable: isMigrationDfyCheckoutAvailable(),
    migrationDfy: {
      label: MIGRATION_DFY.label,
      priceEur: MIGRATION_DFY.priceEur,
    },
    founderCockpitEligible: isFounderKancelariaEligible(),
    founderCockpitEligible: founderEligible,
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
      // Purchasable at the price shown below — not merely "a price exists".
      // The founder and standard prices are separate Stripe objects and the
      // UI renders whichever applies, so the check must use the same one.
      ownerPurchasable: isOwnerCockpitPurchasable({ founderEligible }),
      ownerPriceEur: ownerCockpitPriceEur({ founderEligible: false }),
      ownerFounderPriceEur: ownerCockpitPriceEur({ founderEligible: true }),
      cockpitLiteEligible,
    },
    topupPackages: TOPUP_PACKAGE_KEYS.map((key) => TOPUP_PACKAGES[key]),
  });
}
