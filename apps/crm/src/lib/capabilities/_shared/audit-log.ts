import type { CapabilityAuditEntry } from "@/lib/capabilities/_shared/types";

const entries: CapabilityAuditEntry[] = [];

/** In-memory audit for unit tests and early Wave 1 — replace with DB when needed. */
export function appendCapabilityAudit(entry: Omit<CapabilityAuditEntry, "at">): CapabilityAuditEntry {
  const row: CapabilityAuditEntry = { ...entry, at: new Date().toISOString() };
  entries.push(row);
  return row;
}

export function listCapabilityAudit(capability?: string): CapabilityAuditEntry[] {
  if (!capability) return [...entries];
  return entries.filter((e) => e.capability === capability);
}

export function clearCapabilityAuditForTests(): void {
  entries.length = 0;
}
