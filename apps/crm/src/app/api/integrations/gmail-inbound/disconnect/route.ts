import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/api-response";
import { validateQuery } from "@/lib/api-validate";
import { getCurrentProfile } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { incrementUsageMetric } from "@/lib/usage-metrics";
import { canManageGmailConnection, decryptToken, readConnectConfig, revokeGoogleToken } from "@/lib/inbound/gmail-connect";
import { readCiphertext, wipeConnection } from "@/lib/inbound/gmail-connect-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Odpojenie: odvolá token u Googlu a zmaže uložený ciphertext. Funguje aj keď Google nie je dostupný. */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  // Odpojenie nemá žiadne parametre; cokoľvek navyše je chyba volajúceho, nie povel.
  const query = validateQuery(url.searchParams, z.object({}).strict());
  if (!query.ok) return query.response;
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.redirect(new URL("/login", origin), 303);
  if (!canManageGmailConnection(profile)) return NextResponse.redirect(new URL("/forbidden", origin), 303);

  const limit = await rateLimit(`gmail-disconnect:${profile.id}`, 10);
  if (!limit.allowed) return errorResponse("rate_limited", 429);

  // Lokálne zmazanie je dôležitejšie než odvolanie u Googlu: najprv zhoď ciphertext,
  // potom sa pokús o revoke. Používateľ sa môže vždy dostať do stavu "Revolis nič nečíta".
  const cfg = readConnectConfig(process.env, origin);
  const blob = await readCiphertext(profile.agency_id);
  const wiped = await wipeConnection(profile.agency_id);
  if (wiped && blob && !("error" in cfg)) {
    try {
      await revokeGoogleToken(decryptToken(blob, cfg.tokenKey), fetch);
    } catch {
      // token sa nedal dešifrovať (zmenený kľúč) — v DB už nie je, v Google účte ho možno odobrať ručne
    }
  }
  if (wiped) await incrementUsageMetric({ agencyId: profile.agency_id, metric: "gmail_disconnect" });
  return NextResponse.redirect(new URL(`/integrations?gmail=${wiped ? "disconnected" : "error&reason=db_write_failed"}`, origin), 303);
}
