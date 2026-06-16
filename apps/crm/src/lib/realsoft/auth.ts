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

  const { data, error } = await sb
    .from("agencies")
    .select("id, realsoft_export_user, realsoft_export_pass")
    .not("realsoft_export_user", "is", null)
    .not("realsoft_export_pass", "is", null);

  if (error) return { ok: false, reason: "db_unavailable" };

  const match = (data ?? []).find((row) => {
    const rowUser = normalizeLogin(String(row.realsoft_export_user ?? ""));
    const rowPass = String(row.realsoft_export_pass ?? "").trim();
    return rowUser === normalizedUser && rowPass === normalizedPass;
  });

  if (!match?.id) return { ok: false, reason: "invalid_credentials" };
  return { ok: true, agencyId: match.id };
}

