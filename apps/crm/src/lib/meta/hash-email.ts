import { createHash } from "node:crypto";

/**
 * Meta vyžaduje e-maily normalizované (trim + lowercase) a zahashované SHA-256 (hex).
 * Do Meta nikdy nejde čistý e-mail — komentár v tomto súbore to tvrdil, kód to nerobil
 * (PII-GATE-AUDIT B1).
 */
export function hashEmailForMeta(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase(), "utf8").digest("hex");
}

/** Platné, deduplikované hashe; riadky bez použiteľného e-mailu sa preskočia (null už nezhodí route). */
export function hashedEmailRows(leads: Array<{ email?: unknown }>): string[][] {
  const seen = new Set<string>();
  for (const l of leads) {
    if (typeof l.email !== "string") continue;
    const email = l.email.trim().toLowerCase();
    if (!email.includes("@")) continue;
    seen.add(hashEmailForMeta(email));
  }
  return [...seen].map((h) => [h]);
}
