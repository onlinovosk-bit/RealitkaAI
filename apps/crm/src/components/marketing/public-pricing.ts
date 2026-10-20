/**
 * Verejné zobrazenie cien (PR1 §4). Server-only logika bez Reactu.
 *
 * `PRICING_PUBLIC_ENABLED` je predvolene VYPNUTÉ. Kým nie je zapnuté (a zároveň `PRICING_V2_ENABLED`), verejné stránky
 * dostanú `null` a nesmú dostať žiadne cenové dáta (ani ako prop klientskeho komponentu, ani v RSC payloade).
 */
import { buildPricingV2Catalog, isPricingV2Enabled, isPricingV2PlansOnly, type PricingV2Catalog } from "@/lib/pricing-v2";
import { isPricingPublicEnabled } from "@/lib/pricing-v2-contract";

/** Katalóg pre VEREJNÝ web: len keď sú zapnuté obe (v2 aj verejné ceny). Inak null = „Cenu vám pošleme na vyžiadanie“. */
export function getPublicPricingCatalog(
  env: Record<string, string | undefined> = process.env,
): PricingV2Catalog | null {
  if (!(isPricingPublicEnabled(env) && isPricingV2Enabled(env))) return null;
  const catalog = buildPricingV2Catalog();
  // Režim „len plány“ (predvolený): balíky a jednorazový kredit sa nepredávajú, tak sa ani neinzerujú.
  return isPricingV2PlansOnly(env) ? { ...catalog, packs: [] } : catalog;
}
