/**
 * Wave 0 — read-only kontrola mapovania Stripe price → plan key.
 * Usage (from apps/crm):
 *   npx tsx scripts/reconcile-billing.ts
 * Requires .env.local with STRIPE_SECRET_KEY and STRIPE_PRICE_* vars.
 */
import dotenv from "dotenv";
import path from "node:path";
import { resolvePlanKeyFromStripePriceId } from "../src/lib/billing-store";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const PRICE_ENV_KEYS = [
  "STRIPE_PRICE_STARTER",
  "STRIPE_PRICE_PRO",
  "STRIPE_PRICE_SCALE",
  "STRIPE_PRICE_MARKET_VISION",
  "STRIPE_PRICE_ENTERPRISE",
  "STRIPE_PRICE_PROTOCOL_AUTH",
  "STRIPE_PRICE_ONBOARDING",
  "STRIPE_PRICE_ADDON_LEADS_ENGINE",
  "STRIPE_PRICE_ADDON_MARKET_INTELLIGENCE",
  "STRIPE_PRICE_ADDON_PROTOCOL_AI",
  "STRIPE_PRICE_ADDON_ACTIVE_FORCE_CALLS",
] as const;

function main(): number {
  let issues = 0;
  console.log("[reconcile-billing] Price ID → plan key\n");

  for (const key of PRICE_ENV_KEYS) {
    const priceId = process.env[key];
    if (!priceId) {
      console.log(`  SKIP  ${key} (not set)`);
      continue;
    }
    const plan = resolvePlanKeyFromStripePriceId(priceId);
    console.log(`  OK    ${key} → ${plan}`);
  }

  const unknownSample = "price_unknown_wave0_smoke";
  const unknownPlan = resolvePlanKeyFromStripePriceId(unknownSample);
  if (unknownPlan !== "free") {
    console.error(`  FAIL  unknown price should map to free, got: ${unknownPlan}`);
    issues++;
  } else {
    console.log(`  OK    unknown price → free (expected)`);
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn("\n[WARN] STRIPE_SECRET_KEY missing — no live Stripe API calls performed.");
  }

  console.log(`\n[reconcile-billing] Done. issues=${issues}`);
  return issues > 0 ? 1 : 0;
}

process.exit(main());
