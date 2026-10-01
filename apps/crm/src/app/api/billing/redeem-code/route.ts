import { NextResponse } from "next/server";
import { okResponse, errorResponse } from "@/lib/api-response";
import { redeemStarterPackCode } from "@/lib/starter-pack/redemption";

async function resolveAgencyId(): Promise<string | null> {
  const { getCurrentProfile } = await import("@/lib/auth");
  const profile = await getCurrentProfile();
  const agencyId = (profile as { agency_id?: string } | null)?.agency_id;
  return agencyId ?? null;
}

export async function POST(request: Request) {
  const agencyId = await resolveAgencyId();
  if (!agencyId) {
    return errorResponse("Nie ste prihlásený alebo chýba agentúra.", 401);
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Neplatné JSON telo.", 400);
  }

  const code = String(body.code ?? "").trim();
  if (!code) {
    return errorResponse("Zadajte kód z balíka.", 400);
  }

  const result = await redeemStarterPackCode({ code, agencyId });

  if (!result.ok) {
    const messages: Record<string, string> = {
      invalid_code: "Neplatný formát kódu.",
      code_not_found: "Kód sa nenašiel. Skontrolujte preklep.",
      code_already_used: "Kód už bol uplatnený iným účtom.",
      agency_not_found: "Agentúra sa nenašla.",
      grant_failed: "Nepodarilo sa pripísať kredity. Skúste znova.",
      service_unavailable: "Služba momentálne nie je dostupná.",
    };
    return errorResponse(messages[result.error] ?? "Uplatnenie zlyhalo.", 400);
  }

  return okResponse({
    creditsGranted: result.creditsGranted,
    alreadyRedeemed: result.alreadyRedeemed,
    message: result.alreadyRedeemed
      ? "Kód už bol na tomto účte uplatnený."
      : `Pripísaných ${result.creditsGranted} kreditov.`,
  });
}
