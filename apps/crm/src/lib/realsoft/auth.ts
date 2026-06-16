import { createServiceRoleClient } from "@/lib/supabase/admin";

type RealsoftAuthResult =
  | { ok: true; agencyId: string }
  | { ok: false; reason: "db_unavailable" | "invalid_credentials" };

function normalizeLogin(input: string): string {
  return input.trim().toLowerCase();
}

export async function resolveAgencyIdFromRealsoftCredentials(
  user: string,
  pass: string,
): Promise<RealsoftAuthResult> {
  const sb = createServiceRoleClient();
  if (!sb) return { ok: false, reason: "db_unavailable" };

  const normalizedUser = normalizeLogin(user);
  const normalizedPass = pass.trim();
  if (!normalizedUser || !normalizedPass) {
    return { ok: false, reason: "invalid_credentials" };
  }

  const { data, error } = await sb.rpc("resolve_agency_id_for_realsoft_credentials", {
    p_user: normalizedUser,
    p_pass: normalizedPass,
  });

  if (error) return { ok: false, reason: "db_unavailable" };
  if (typeof data !== "string" || !data.trim()) return { ok: false, reason: "invalid_credentials" };

  return { ok: true, agencyId: data.trim() };
}

