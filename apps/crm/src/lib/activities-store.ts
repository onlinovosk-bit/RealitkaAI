import { supabaseClient } from "@/lib/supabase/client";

export type ActivityItem = {
  id: string;
  leadId: string | null;
  profileId: string | null;
  type: string;
  title: string;
  text: string;
  entityType: string;
  entityId: string | null;
  actorName: string;
  source: string;
  severity: string;
  meta: Record<string, unknown>;
  createdAt: string;
  metadata?: {
    experiment?: string;
    variant?: string;
    [key: string]: any;
  };
};

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return supabaseClient;
}

function repairTextEncoding(value: string) {
  if (!value) return "";

  // Fix common mojibake patterns when UTF-8 text was decoded as Latin-1.
  let repaired = value;
  if (/[ÃÅÄÂ]/.test(repaired)) {
    try {
      repaired = Buffer.from(repaired, "latin1").toString("utf8");
    } catch {
      // Keep original text if conversion fails.
    }
  }

  // Known fallback fixes for already-corrupted values with replacement chars.
  const knownFixes: Array<[string, string]> = [
    ["Kov�cov�", "Kováčová"],
    ["Napl�nova�", "Naplánovať"],
  ];

  for (const [broken, fixed] of knownFixes) {
    repaired = repaired.replaceAll(broken, fixed);
  }

  return repaired;
}

export async function listActivities(limit = 200): Promise<ActivityItem[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("listActivities error:", error.message);
    return [];
  }

  return (data ?? []).map((item: any) => ({
    id: item.id,
    leadId: item.lead_id ?? null,
    profileId: item.profile_id ?? null,
    type: item.type ?? "Systém",
    title: repairTextEncoding(item.title ?? ""),
    text: repairTextEncoding(item.text ?? ""),
    entityType: item.entity_type ?? "lead",
    entityId: item.entity_id ?? null,
    actorName: repairTextEncoding(item.actor_name ?? ""),
    source: item.source ?? "system",
    severity: item.severity ?? "info",
    meta: item.meta ?? {},
    createdAt: item.created_at,
  }));
}

export async function listActivitiesForLead(leadId: string): Promise<ActivityItem[]> {
  const all = await listActivities(500);
  return all.filter((item) => item.leadId === leadId);
}

export async function createActivity(input: {
  leadId?: string | null;
  profileId?: string | null;
  type: string;
  title?: string;
  text: string;
  entityType?: string;
  entityId?: string | null;
  actorName?: string;
  source?: string;
  severity?: string;
  meta?: Record<string, unknown>;
}) {
  const supabase = getSupabaseClient();

  const payload = {
    lead_id: input.leadId ?? null,
    profile_id: input.profileId ?? null,
    type: input.type,
    title: repairTextEncoding(input.title ?? ""),
    text: repairTextEncoding(input.text),
    entity_type: input.entityType ?? "lead",
    entity_id: input.entityId ?? input.leadId ?? null,
    actor_name: repairTextEncoding(input.actorName ?? ""),
    source: input.source ?? "system",
    severity: input.severity ?? "info",
    meta: input.meta ?? {},
  };

  if (!supabase) {
    return {
      id: crypto.randomUUID(),
      leadId: payload.lead_id,
      profileId: payload.profile_id,
      type: payload.type,
      title: payload.title,
      text: payload.text,
      entityType: payload.entity_type,
      entityId: payload.entity_id,
      actorName: payload.actor_name,
      source: payload.source,
      severity: payload.severity,
      meta: payload.meta,
      createdAt: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase
    .from("activities")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: data.id,
    leadId: data.lead_id ?? null,
    profileId: data.profile_id ?? null,
    type: data.type ?? "Systém",
    title: repairTextEncoding(data.title ?? ""),
    text: repairTextEncoding(data.text ?? ""),
    entityType: data.entity_type ?? "lead",
    entityId: data.entity_id ?? null,
    actorName: repairTextEncoding(data.actor_name ?? ""),
    source: data.source ?? "system",
    severity: data.severity ?? "info",
    meta: data.meta ?? {},
    createdAt: data.created_at,
  };
}
