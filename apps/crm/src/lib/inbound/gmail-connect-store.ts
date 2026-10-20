import { createServiceRoleClient } from "@/lib/supabase/admin";

/** Verejný pohľad na pripojenie — nikdy nenesie token ani jeho šifrovanú podobu. */
export type GmailConnectionStatus = {
  status: "active" | "error" | "revoked";
  gmailUserEmail: string;
  labelName: string;
  consentRecordedAt: string;
  lastPulledAt: string | null;
  lastError: string | null;
};

export type ActiveConnection = {
  agencyId: string;
  ciphertext: string;
  labelName: string;
};

export async function saveConnection(input: {
  agencyId: string;
  profileId: string;
  gmailUserEmail: string;
  ciphertext: string;
  scopes: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = createServiceRoleClient();
  if (!sb) return { ok: false, error: "db_unavailable" };
  const { error } = await sb.from("agency_gmail_inbound_oauth").upsert(
    {
      agency_id: input.agencyId,
      granted_by_profile_id: input.profileId,
      gmail_user_email: input.gmailUserEmail,
      refresh_token_ciphertext: input.ciphertext,
      token_key_version: "v1",
      scopes: input.scopes,
      status: "active",
      consent_recorded_at: new Date().toISOString(),
      last_error: null,
      revoked_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "agency_id" },
  );
  return error ? { ok: false, error: "db_write_failed" } : { ok: true };
}

export async function getConnectionStatus(agencyId: string): Promise<GmailConnectionStatus | null> {
  const sb = createServiceRoleClient();
  if (!sb) return null;
  const { data } = await sb
    .from("agency_gmail_inbound_oauth")
    .select("status,gmail_user_email,label_name,consent_recorded_at,last_pulled_at,last_error")
    .eq("agency_id", agencyId)
    .maybeSingle();
  const row = data as {
    status: GmailConnectionStatus["status"];
    gmail_user_email: string;
    label_name: string;
    consent_recorded_at: string;
    last_pulled_at: string | null;
    last_error: string | null;
  } | null;
  if (!row) return null;
  return {
    status: row.status,
    gmailUserEmail: row.gmail_user_email,
    labelName: row.label_name,
    consentRecordedAt: row.consent_recorded_at,
    lastPulledAt: row.last_pulled_at,
    lastError: row.last_error,
  };
}

/** Pre pull: iba aktívne pripojenia. Chyba čítania sa nezamlčí — vyhodí. */
export async function loadActiveConnections(): Promise<ActiveConnection[]> {
  const sb = createServiceRoleClient();
  if (!sb) throw new Error("db_unavailable");
  const { data, error } = await sb
    .from("agency_gmail_inbound_oauth")
    .select("agency_id,refresh_token_ciphertext,label_name")
    .eq("status", "active");
  if (error) throw new Error("connections_read_failed");
  return ((data ?? []) as { agency_id: string; refresh_token_ciphertext: string; label_name: string }[])
    .filter((r) => r.refresh_token_ciphertext)
    .map((r) => ({ agencyId: r.agency_id, ciphertext: r.refresh_token_ciphertext, labelName: r.label_name }));
}

export async function markPulled(agencyId: string): Promise<void> {
  const sb = createServiceRoleClient();
  if (!sb) return;
  await sb
    .from("agency_gmail_inbound_oauth")
    .update({ last_pulled_at: new Date().toISOString(), last_error: null, status: "active" })
    .eq("agency_id", agencyId);
}

/** `status: 'error'` pri vypršanom/odvolanom tokene — pull sa potom nepokúša dookola. */
export async function markError(agencyId: string, code: string, disable: boolean): Promise<void> {
  const sb = createServiceRoleClient();
  if (!sb) return;
  await sb
    .from("agency_gmail_inbound_oauth")
    .update({ last_error: code.slice(0, 200), ...(disable ? { status: "error" } : {}) })
    .eq("agency_id", agencyId);
}

/** Odpojenie: ciphertext sa maže (nie len označí), zostáva stopa kedy a kto. */
export async function wipeConnection(agencyId: string): Promise<boolean> {
  const sb = createServiceRoleClient();
  if (!sb) return false;
  const { error } = await sb
    .from("agency_gmail_inbound_oauth")
    .update({
      refresh_token_ciphertext: "",
      status: "revoked",
      revoked_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("agency_id", agencyId);
  return !error;
}

export async function readCiphertext(agencyId: string): Promise<string | null> {
  const sb = createServiceRoleClient();
  if (!sb) return null;
  const { data } = await sb
    .from("agency_gmail_inbound_oauth")
    .select("refresh_token_ciphertext")
    .eq("agency_id", agencyId)
    .maybeSingle();
  return (data as { refresh_token_ciphertext?: string } | null)?.refresh_token_ciphertext || null;
}
