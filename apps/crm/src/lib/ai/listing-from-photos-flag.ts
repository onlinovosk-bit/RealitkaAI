/**
 * Phase 1 — AI listing text from photos + parameters.
 * Default OFF in every environment. Production enable is a founder GO:
 *   LISTING_FROM_PHOTOS_V0=1
 */
export function isListingFromPhotosEnabled(): boolean {
  return process.env.LISTING_FROM_PHOTOS_V0 === "1";
}
