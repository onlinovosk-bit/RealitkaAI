/**
 * Gate for acquisition sync persistence.
 * Default is off. Only the exact string "true" enables writes.
 * Workers must not call persist/* unless this returns true.
 * Never prefix this name with NEXT_PUBLIC_.
 */
export const ACQUISITION_PERSIST_SYNC_ENV = "ACQUISITION_PERSIST_SYNC" as const;

export function isAcquisitionPersistSyncEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[ACQUISITION_PERSIST_SYNC_ENV] === "true";
}