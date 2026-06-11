import type { SupabaseClient } from "@supabase/supabase-js";
import { daysSince } from "./health";
import type { AgencyActivationSnapshot } from "./types";

type AgencyRow = {
  id: string;
  name: string;
  created_at: string;
  activation_email_opt_out?: boolean;
};

export async function gatherAgencyActivationSnapshot(
  admin: SupabaseClient,
  agencyId: string,
): Promise<AgencyActivationSnapshot | null> {
  const { data: agency, error: agencyError } = await admin
    .from("agencies")
    .select("id, name, created_at, activation_email_opt_out")
    .eq("id", agencyId)
    .maybeSingle();

  if (agencyError || !agency) return null;
  const a = agency as AgencyRow;

  const { data: owner } = await admin
    .from("profiles")
    .select("id, full_name, email, updated_at, ui_role")
    .eq("agency_id", agencyId)
    .in("ui_role", ["owner", "owner_vision"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const ownerEmail = (owner?.email as string | undefined)?.trim();
  if (!ownerEmail) return null;

  const { count: importCount } = await admin
    .from("import_jobs")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", agencyId)
    .eq("status", "done")
    .gt("imported_rows", 0);

  const { count: scoredCount } = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", agencyId)
    .gt("score", 0);

  const { data: topScoreRow } = await admin
    .from("leads")
    .select("score")
    .eq("agency_id", agencyId)
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle();

  const profileId = owner?.id as string | undefined;
  let morningReportEnabled = false;
  if (profileId) {
    const { data: briefSettings } = await admin
      .from("morning_brief_settings")
      .select("enabled")
      .eq("profile_id", profileId)
      .maybeSingle();
    morningReportEnabled = Boolean(briefSettings?.enabled);
  }

  let painMirror: string | undefined;
  const { data: booking } = await admin
    .from("demo_bookings")
    .select("utm_term, utm_content, raw_payload")
    .ilike("invitee_email", ownerEmail)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (booking?.utm_term?.startsWith("goals_")) {
    painMirror = booking.utm_term.replace(/^goals_/, "").replace(/_/g, " ");
  }

  return {
    agencyId: a.id,
    agencyName: a.name,
    agencyCreatedAt: a.created_at,
    ownerEmail,
    ownerName: (owner?.full_name as string) || "kolega",
    painMirror: painMirror ?? "nevieš, komu volať ako prvému",
    hasImport: (importCount ?? 0) > 0,
    scoredLeadCount: scoredCount ?? 0,
    highestScore: (topScoreRow?.score as number | null) ?? null,
    morningReportEnabled,
    lastLoginAt: (owner?.updated_at as string) ?? null,
    daysSinceSignup: daysSince(a.created_at),
    optOut: Boolean(a.activation_email_opt_out),
  };
}

export async function listNewAgenciesForActivation(
  admin: SupabaseClient,
  maxDays = 14,
): Promise<string[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxDays);

  const { data, error } = await admin
    .from("agencies")
    .select("id")
    .gte("created_at", cutoff.toISOString())
    .eq("is_active", true);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.id as string);
}
