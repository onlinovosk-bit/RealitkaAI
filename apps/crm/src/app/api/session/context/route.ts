import { okResponse, errorResponse } from "@/lib/api-response";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";

/**
 * GET /api/session/context – agency_id pre Realtime filter (klient).
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return errorResponse("Neautorizovaný prístup.", 401);
  }

  const profile = await getCurrentProfile();

  return okResponse({
    userId: user.id,
    profileId: profile?.id ?? null,
    agencyId: profile?.agency_id ?? null,
    teamId: profile?.team_id ?? null,
  });
}
