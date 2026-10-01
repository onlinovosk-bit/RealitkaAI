/**
 * B08 — z čoho Concierge berie prístup do Google kalendára.
 *
 * Doteraz to bol `CONCIERGE_GOOGLE_ACCESS_TOKEN` v env: krátkodobý access token,
 * ktorý expiruje rádovo v hodine a musel by ho niekto ručne obnovovať. Systém
 * pritom už má refresh-token infraštruktúru (`profile_google_calendar` +
 * `getGoogleCalendarAccessToken`), ktorá obnovu rieši sama.
 *
 * Väzba je preto na PROFIL, nie na token: `CONCIERGE_GOOGLE_PROFILE_ID` hovorí,
 * ktorého človeka kalendár Concierge používa. Refresh token nikdy nejde do env.
 */

export type ConciergeTokenResult =
  | { ok: true; accessToken: string }
  | { ok: false; reason: "oauth_missing"; detail: ConciergeTokenFailure };

/**
 * Dôvody sú konštanty, nie prepošlané chybové hlášky. Do odpovede ani do logu
 * sa tak nemôže dostať nič z tokenu ani z Google odpovede.
 */
export type ConciergeTokenFailure =
  | "concierge_profile_unbound"
  | "concierge_token_unavailable"
  | "concierge_token_lookup_failed";

export type ConciergeTokenDeps = {
  /** `CONCIERGE_GOOGLE_PROFILE_ID` — profil, ktorého kalendár Concierge používa. */
  profileId?: string | null;
  /** `getGoogleCalendarAccessToken` — vráti platný token, sama rieši refresh. */
  getAccessToken: (profileId: string) => Promise<string | null>;
};

/**
 * Fail-closed vo všetkých troch smeroch. Žiadna vetva nevracia „asi voľné" —
 * volajúci dostane `oauth_missing` a nikdy nie vymyslenú dostupnosť.
 */
export async function resolveConciergeAccessToken(
  deps: ConciergeTokenDeps,
): Promise<ConciergeTokenResult> {
  const profileId = deps.profileId?.trim();
  if (!profileId) {
    return { ok: false, reason: "oauth_missing", detail: "concierge_profile_unbound" };
  }

  let token: string | null;
  try {
    token = await deps.getAccessToken(profileId);
  } catch {
    // Zlyhaný refresh alebo nedostupná DB. Dôvod sa nerozvádza: chybová hláška
    // z OAuth endpointu môže niesť obsah, ktorý do odpovede nepatrí.
    return { ok: false, reason: "oauth_missing", detail: "concierge_token_lookup_failed" };
  }

  if (!token?.trim()) {
    // Žiadny riadok v `profile_google_calendar`, alebo refresh neprešiel.
    return { ok: false, reason: "oauth_missing", detail: "concierge_token_unavailable" };
  }

  return { ok: true, accessToken: token };
}
