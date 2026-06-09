/**
 * Guard — zabráni E2E/smoke testom bežať na produkcii
 * Importuj na začiatku každého E2E test súboru
 */
export function assertNotProduction() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const isProd = url.includes("ypgajkhqtbriqqmyawyv");

  if (isProd) {
    throw new Error(
      "🚫 ODMIETNUTÉ: E2E testy nesmú bežať na produkcii!\n" +
        "Nastav NEXT_PUBLIC_SUPABASE_URL na staging/preview DB.\n" +
        `Aktuálna URL: ${url}`,
    );
  }
}
