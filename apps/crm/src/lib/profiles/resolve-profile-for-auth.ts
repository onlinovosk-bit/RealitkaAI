import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  entitlementRank,
  normalizeProfileEntitlements,
} from "@/lib/profiles/normalize-profile-entitlements";

export type ResolvedAuthProfile = {
  id: string;
  agency_id: string | null;
  auth_user_id?: string | null;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  ui_role?: string | null;
  account_tier?: string | null;
  team_license_id?: string | null;
  agency_name?: string | null;
};

type ProfileLookupResult = {
  profile: ResolvedAuthProfile | null;
};

/** Reality Smolko tenant — canonical agency UUID (prod). */
export const SMOLKO_AGENCY_ID = "11111111-1111-1111-1111-111111111111";

/** Reality Smolko owner logins (prod + Google auth). */
export function isSmolkoOwnerEmail(email: string | null | undefined): boolean {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized === "office@realitysmolko.sk" ||
    normalized === "rastislav.smolko@gmail.com" ||
    normalized.endsWith("@realitysmolko.sk")
  );
}

/**
 * Google login (gmail) vs profiles.email (office@) — oba musia nájsť ten istý riadok.
 */
export function smolkoProfileLookupEmails(loginEmail: string | null | undefined): string[] {
  const candidates = new Set<string>();
  const normalized = String(loginEmail ?? "").trim().toLowerCase();
  if (normalized) candidates.add(normalized);
  if (isSmolkoOwnerEmail(normalized)) {
    // Prod owner prihlásenie je gmail; office@ riadok nemusí existovať.
    candidates.add("rastislav.smolko@gmail.com");
    candidates.add("office@realitysmolko.sk");
  }
  return [...candidates];
}

async function findSmolkoOwnerProfileViaServiceRole(
  service: SupabaseClient,
  userId: string,
  loginEmail: string | null | undefined,
  select: string,
): Promise<ResolvedAuthProfile | null> {
  if (!isSmolkoOwnerEmail(loginEmail)) return null;

  const { data: owners } = await service
    .from("profiles")
    .select(select)
    .eq("agency_id", SMOLKO_AGENCY_ID)
    .in("role", ["owner", "founder"]);

  if (!owners?.length) return null;

  const linkedOwner = owners.find(
    (row) => (row as ResolvedAuthProfile).auth_user_id === userId,
  ) as ResolvedAuthProfile | undefined;
  if (linkedOwner) {
    return linkedOwner;
  }

  const loginCandidates = new Set(
    smolkoProfileLookupEmails(loginEmail).map((e) => e.toLowerCase()),
  );

  let emailMatch: ResolvedAuthProfile | null = null;
  let best: ResolvedAuthProfile | null = null;
  for (const row of owners) {
    const profile = row as ResolvedAuthProfile;
    const rowEmail = String(profile.email ?? "").trim().toLowerCase();
    if (loginCandidates.has(rowEmail)) {
      emailMatch = pickPreferredProfile(emailMatch, profile);
    }
    best = pickPreferredProfile(best, profile);
  }

  return emailMatch ?? best;
}

async function findProfileByEmailCandidates(
  client: SupabaseClient,
  loginEmail: string | null | undefined,
  select: string,
): Promise<ProfileLookupResult> {
  for (const candidate of smolkoProfileLookupEmails(loginEmail)) {
    const { data } = await client
      .from("profiles")
      .select(select)
      .ilike("email", candidate)
      .maybeSingle();
    if (data) {
      return { profile: data as ResolvedAuthProfile };
    }
  }
  return { profile: null };
}

function pickPreferredProfile(
  authProfile: ResolvedAuthProfile | null,
  emailProfile: ResolvedAuthProfile | null,
): ResolvedAuthProfile | null {
  if (!authProfile) return emailProfile;
  if (!emailProfile) return authProfile;
  return entitlementRank(emailProfile) > entitlementRank(authProfile)
    ? emailProfile
    : authProfile;
}

/**
 * Profil pre prihláseného auth usera — zhodné s `profile_agencies_for_auth()`:
 * `auth_user_id` alebo legacy `profiles.id`.
 */
export async function resolveProfileForAuthUser(
  supabase: SupabaseClient,
  userId: string,
  select = "id, agency_id, auth_user_id",
  email?: string | null,
): Promise<{
  profile: ResolvedAuthProfile | null;
  profileMissingAgency: boolean;
}> {
  const { profile } = await findProfileForAuthUser(supabase, userId, email, select);
  const normalized = normalizeProfileEntitlements(profile);
  return {
    profile: normalized,
    profileMissingAgency: !normalized?.agency_id,
  };
}

/** Service role: merge auth, legacy id, and email rows — pick highest entitlement. */
async function findProfileViaServiceRole(
  service: SupabaseClient,
  userId: string,
  email: string | null | undefined,
  select: string,
  seed: ResolvedAuthProfile | null,
): Promise<ResolvedAuthProfile | null> {
  let best = seed;

  const byAuth = await service
    .from("profiles")
    .select(select)
    .eq("auth_user_id", userId)
    .maybeSingle();
  best = pickPreferredProfile(best, (byAuth.data as ResolvedAuthProfile) ?? null);

  const byLegacyId = await service
    .from("profiles")
    .select(select)
    .eq("id", userId)
    .maybeSingle();
  best = pickPreferredProfile(best, (byLegacyId.data as ResolvedAuthProfile) ?? null);

  const byEmail = await findProfileByEmailCandidates(service, email, select);
  best = pickPreferredProfile(best, byEmail.profile);

  const smolkoOwner = await findSmolkoOwnerProfileViaServiceRole(
    service,
    userId,
    email,
    select,
  );
  best = pickPreferredProfile(best, smolkoOwner);

  return best;
}

async function persistAuthUserIdLink(
  profileId: string,
  userId: string,
  supabase: SupabaseClient,
): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({ auth_user_id: userId })
    .eq("id", profileId);

  if (!error) {
    return true;
  }

  const service = createServiceRoleClient();
  if (!service) {
    return false;
  }

  const { error: serviceError } = await service
    .from("profiles")
    .update({ auth_user_id: userId })
    .eq("id", profileId);

  return !serviceError;
}

async function findProfileForAuthUser(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null,
  select = "id, agency_id, auth_user_id",
): Promise<ProfileLookupResult> {
  const byAuth = await supabase
    .from("profiles")
    .select(select)
    .eq("auth_user_id", userId)
    .maybeSingle();

  let authProfile: ResolvedAuthProfile | null = byAuth.data
    ? (byAuth.data as ResolvedAuthProfile)
    : null;

  if (!authProfile) {
    const byLegacyId = await supabase
      .from("profiles")
      .select(select)
      .eq("id", userId)
      .maybeSingle();
    if (byLegacyId.data) {
      authProfile = byLegacyId.data as ResolvedAuthProfile;
    }
  }

  const byEmail = await findProfileByEmailCandidates(supabase, email, select);
  let preferred = pickPreferredProfile(authProfile, byEmail.profile);

  // RLS often hides the canonical email row while auth_user_id stub is visible — always merge via service role.
  const service = createServiceRoleClient();
  if (service) {
    preferred = await findProfileViaServiceRole(
      service,
      userId,
      email,
      select,
      preferred,
    );
  }

  if (preferred) {
    return { profile: preferred };
  }

  return { profile: null };
}

/**
 * Prepojí `profiles.auth_user_id` na aktuálne prihlásenie — RLS `profile_agencies_for_auth()`
 * inak nevráti agency_id (profil existuje len pod e-mailom / legacy id).
 */
export async function linkProfileToAuthUser(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null,
): Promise<ResolvedAuthProfile | null> {
  const { profile } = await findProfileForAuthUser(
    supabase,
    userId,
    email,
    "id, agency_id, auth_user_id, email, role, ui_role, account_tier",
  );

  const service = createServiceRoleClient();
  if (isSmolkoOwnerEmail(email) && service) {
    const smolkoCanonical = await findSmolkoOwnerProfileViaServiceRole(
      service,
      userId,
      email,
      "id, agency_id, auth_user_id, email, role, ui_role, account_tier",
    );
    if (
      smolkoCanonical &&
      (!profile?.agency_id ||
        profile.agency_id !== SMOLKO_AGENCY_ID ||
        entitlementRank(smolkoCanonical) > entitlementRank(profile))
    ) {
      profile = smolkoCanonical;
    }
  }

  if (profile?.auth_user_id === userId && profile.agency_id) {
    const normalized = normalizeProfileEntitlements(profile);
    if (
      normalized &&
      (normalized.role !== profile.role ||
        normalized.ui_role !== profile.ui_role ||
        normalized.account_tier !== profile.account_tier)
    ) {
      await supabase
        .from("profiles")
        .update({
          role: normalized.role,
          ui_role: normalized.ui_role,
          account_tier: normalized.account_tier,
          tier_updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);
    }
    return normalized;
  }

  if (profile && !profile.auth_user_id) {
    const linkedOk = await persistAuthUserIdLink(profile.id, userId, supabase);
    const linked = normalizeProfileEntitlements(
      linkedOk ? { ...profile, auth_user_id: userId } : profile,
    );

    if (linkedOk && linked && (linked.role || linked.ui_role || linked.account_tier)) {
      const tierPayload = {
        role: linked.role,
        ui_role: linked.ui_role,
        account_tier: linked.account_tier,
        tier_updated_at: new Date().toISOString(),
      };
      const { error: tierError } = await supabase
        .from("profiles")
        .update(tierPayload)
        .eq("id", linked.id);

      if (tierError) {
        const service = createServiceRoleClient();
        if (service) {
          await service.from("profiles").update(tierPayload).eq("id", linked.id);
        }
      }
    }

    return linked;
  }

  return normalizeProfileEntitlements(profile);
}
