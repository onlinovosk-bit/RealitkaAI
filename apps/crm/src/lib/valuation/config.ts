/** Privacy policy version shown at widget submit — bump when copy changes. */
export const PRIVACY_POLICY_VERSION =
  process.env.PRIVACY_POLICY_VERSION?.trim() || "2026-07-v1";

/** Legacy note tag — kept in lead note for backward-compatible grep. */
export const LEGACY_CONSENT_NOTE_TAG = `gdpr_ver=${PRIVACY_POLICY_VERSION}`;
