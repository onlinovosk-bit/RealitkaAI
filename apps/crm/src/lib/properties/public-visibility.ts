/**
 * SMO-B04 — kontrakt aktívneho stavu a freshness pre verejné zobrazenie ponuky.
 *
 * Register blokujúcich podmienok (`docs/briefs/reality-smolko-blocking-conditions-register.md`)
 * definuje PASS pre SMO-B04 ako tri veci:
 *
 *   1. každý lookup/update viazaný na `agency_id`   — hotové (#569)
 *   2. negatívny test nedokáže čítať cudziu property — hotové (#569)
 *   3. aktívny stav a freshness majú kontrakt        — TENTO SÚBOR
 *
 * Prečo to existuje: `properties` sa plnia zo synchronizácie s Realviou. Riadok
 * v DB je preto tvrdenie o stave sveta v čase poslednej synchronizácie, nie
 * o stave sveta teraz. Ak sync vypadne, riadok tam ostane a bude vyzerať platne.
 * Verejný matcher by tak ukázal ponuku, ktorá je dávno predaná — a to nie je
 * kozmetická chyba, to je klamný inzerát.
 *
 * Kontrakt je preto **whitelist a fail-closed**: neznámy stav, chýbajúci čas
 * synchronizácie aj nečitateľný dátum znamenajú NEZOBRAZIŤ. Dôvod sa vracia
 * ako hodnota, nie ako tiché vypadnutie zo zoznamu — volajúci má povedať
 * čestný stav, nie predstierať, že ponuka neexistovala.
 */

/**
 * Vokabulár stavov.
 *
 * Reálne dáta nesú viac pravopisov toho istého stavu — Realvia, ručné zadanie
 * a staršie importy sa nezhodujú v diakritike ani v jazyku. Porovnávať na jednu
 * kanonickú hodnotu by ticho schovalo legitímne aktívne ponuky, takže sa
 * porovnáva na normalizovaný kľúč proti množine známych zápisov.
 *
 * Tieto množiny boli pôvodne v `properties-store.ts`; presunuté sem, aby
 * „čo znamená aktívna" mal jedno miesto. `properties-store` ich importuje.
 */
export function normalizeStatusKey(status: string): string {
  return status.trim().toLowerCase();
}

export const ACTIVE_STATUS_VALUES: ReadonlySet<string> = new Set([
  "aktívna",
  "aktivna",
  "active",
  "aktivní",
  "aktivni",
]);

export const RESERVED_STATUS_VALUES: ReadonlySet<string> = new Set([
  "rezervovaná",
  "rezervovana",
  "reserved",
]);

export const SOLD_STATUS_VALUES: ReadonlySet<string> = new Set([
  "predaná",
  "predana",
  "sold",
]);

/**
 * Jediná skupina stavov, ktorá smie ísť von.
 *
 * `Rezervovaná` tu zámerne NIE JE. Rezervovaná nehnuteľnosť je stále v systéme,
 * ale ponúknuť ju verejne znamená sľúbiť niečo, čo maklér nemusí vedieť dodržať
 * — presne ten „falošný sľub", pred ktorým register varuje pri SMO-B06.
 * Ak sa founder rozhodne inak, mení sa táto množina, nie logika nižšie.
 */
const PUBLICLY_VISIBLE_STATUSES = ACTIVE_STATUS_VALUES;

/**
 * Koľko dní od poslednej synchronizácie ešte považujeme ponuku za aktuálnu.
 *
 * 7 dní je východisko, nie zákon: je to kompromis medzi „nezobrazovať mŕtve
 * inzeráty" a „nevyprázdniť web pri jednom vynechanom behu". Až bude známa
 * reálna frekvencia Realvia syncu, číslo sa má nastaviť na jej násobok.
 * Prepisuje sa cez `PUBLIC_LISTING_MAX_AGE_DAYS`.
 */
export const DEFAULT_MAX_AGE_DAYS = 7;

export type VisibilityReason =
  | "ok"
  | "status_not_active"
  | "freshness_unknown"
  | "freshness_unparsable"
  | "stale";

export interface PublicVisibilityInput {
  status: string;
  /** Čas poslednej synchronizácie z Realvie (`realvia_updated_at`). */
  realviaUpdatedAt?: string | null;
}

export interface PublicVisibilityResult {
  visible: boolean;
  reason: VisibilityReason;
  /** Vek údaja v dňoch, ak sa dal spočítať. Na čestné „dáta k {dátum}". */
  ageDays?: number;
}

export function maxAgeDays(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number.parseFloat((env.PUBLIC_LISTING_MAX_AGE_DAYS ?? "").trim());
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_AGE_DAYS;
}

/**
 * Smie táto ponuka ísť na verejnosť?
 *
 * Fail-closed: čokoľvek, čo nevieme overiť, je `visible: false` s dôvodom.
 */
export function evaluatePublicVisibility(
  property: PublicVisibilityInput,
  now: Date = new Date(),
  env: NodeJS.ProcessEnv = process.env,
): PublicVisibilityResult {
  if (!PUBLICLY_VISIBLE_STATUSES.has(normalizeStatusKey(property.status))) {
    return { visible: false, reason: "status_not_active" };
  }

  const stamp = property.realviaUpdatedAt;
  if (!stamp) {
    // Nevieme, kedy sa to naposledy synchronizovalo. To nie je "asi čerstvé".
    return { visible: false, reason: "freshness_unknown" };
  }

  const syncedAt = new Date(stamp);
  if (Number.isNaN(syncedAt.getTime())) {
    return { visible: false, reason: "freshness_unparsable" };
  }

  const ageDays = (now.getTime() - syncedAt.getTime()) / 86_400_000;
  if (ageDays > maxAgeDays(env)) {
    return { visible: false, reason: "stale", ageDays };
  }

  // Budúci timestamp (hodinový posun, rozladené hodiny) neblokuje — nie je to
  // dôkaz zastaranosti. Vek sa ale nereportuje ako záporný.
  return { visible: true, reason: "ok", ageDays: Math.max(0, ageDays) };
}

/** Skratka pre filtrovanie zoznamu. Dôvod sa stráca — používaj vedome. */
export function isPubliclyVisible(
  property: PublicVisibilityInput,
  now?: Date,
  env?: NodeJS.ProcessEnv,
): boolean {
  return evaluatePublicVisibility(property, now, env).visible;
}
