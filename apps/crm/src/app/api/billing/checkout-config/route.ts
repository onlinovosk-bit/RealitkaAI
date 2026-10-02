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
  isOwnerCockpitPurchasable,
  missingSeatPriceEnvKeys,
  missingTopupPriceEnvKeys,
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
    // Len boolean (nikdy hodnota): bez webhook secretu platba prejde, ale plán sa neodomkne.
    webhookSecretConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
    // Env var NAMES only (never values) that are unset or not a valid price_*.
    missingPriceEnvKeys: {
      seat: missingSeatPriceEnvKeys(),
      topup: missingTopupPriceEnvKeys(),
    },
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
