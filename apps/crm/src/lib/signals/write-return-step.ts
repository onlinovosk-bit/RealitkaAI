/**
 * Writes the next CRM step and a message draft. Never sends.
 * The broker confirms on the lead; approval uses the stored text only.
 */

import {
  RETURN_SIGNAL_AGENT_ID,
  RETURN_SIGNAL_PROMPT_VERSION,
  ageDaysSince,
  buildReturnStep,
  classifyPriceChange,
  classifyRepeatView,
  isClosedLeadStatus,
  listingAgeBucket,
  readViewTarget,
  type ReturnSignalKind,
  type ReturnStep,
} from "./return-signal";

const ACTIVE_PROPERTY = new Set(["Aktivna", "Aktívna", "active", "Active"]);
const MAX_WRITES = 40;

export type LooseDb = {
  from: (table: string) => any;
};

export interface WriteReturnStepResult {
  wrote: boolean;
  reason?: string;
}

interface LeadRow {
  id: string;
  name: string | null;
  email: string | null;
  status: string | null;
  assigned_profile_id: string | null;
}

async function loadLead(db: LooseDb, leadId: string): Promise<LeadRow | null> {
  const { data, error } = await db
    .from("leads")
    .select("id, name, email, status, assigned_profile_id")
    .eq("id", leadId)
    .limit(1);
  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data[0] as LeadRow;
}

export async function writeReturnStep(
  db: LooseDb,
  input: {
    leadId: string;
    step: ReturnStep;
    propertyId: string;
  },
): Promise<WriteReturnStepResult> {
  const lead = await loadLead(db, input.leadId);
  if (!lead) return { wrote: false, reason: "unknown_lead" };
  if (isClosedLeadStatus(lead.status)) return { wrote: false, reason: "closed_lead" };

  const { data: existing, error: existingErr } = await db
    .from("tasks")
    .select("id")
    .eq("lead_id", input.leadId)
    .eq("title", input.step.title)
    .eq("status", "open")
    .limit(1);
  if (existingErr) return { wrote: false, reason: existingErr.message };
  if (Array.isArray(existing) && existing.length > 0) {
    return { wrote: false, reason: "open_task" };
  }

  const due = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
  const { error: taskErr } = await db.from("tasks").insert({
    lead_id: input.leadId,
    assigned_profile_id: lead.assigned_profile_id,
    title: input.step.title,
    description: input.step.body,
    status: "open",
    priority: "high",
    due_at: due,
  });
  if (taskErr) return { wrote: false, reason: taskErr.message };

  const email = typeof lead.email === "string" && lead.email.includes("@") ? lead.email : "";
  const meta: Record<string, unknown> = {
    draft: true,
    requires_approval: true,
    channel: "email",
    subject: input.step.subject,
    body: input.step.body,
    agent_id: RETURN_SIGNAL_AGENT_ID,
    prompt_version: RETURN_SIGNAL_PROMPT_VERSION,
    signal: input.step.kind,
    property_id: input.propertyId,
  };
  if (email) meta.recipient = email;

  const { error: activityErr } = await db.from("activities").insert({
    lead_id: input.leadId,
    type: "Návrh správy",
    title: input.step.subject,
    text: `${input.step.body}\n\nNeodoslané — maklér potvrdí odoslanie.`,
    entity_type: "lead",
    entity_id: input.leadId,
    actor_name: "Revolis",
    source: "return_signal",
    severity: "info",
    meta,
  });
  if (activityErr) {
    // The task already holds the message. A missing draft must not invent a send.
    return { wrote: true, reason: "draft_failed" };
  }
  return { wrote: true };
}

async function writeForLead(
  db: LooseDb,
  leadId: string,
  step: ReturnStep,
  propertyId: string,
): Promise<boolean> {
  const result = await writeReturnStep(db, { leadId, step, propertyId });
  return result.wrote && result.reason !== "draft_failed";
}

export async function recordPriceChangeSteps(
  db: LooseDb,
  input: {
    propertyId?: string | null;
    listingId?: string | null;
    leadId?: string | null;
    prevPrice: number | null;
    nextPrice: number;
    propertyTitle?: string | null;
  },
): Promise<number> {
  const propertyId = (input.propertyId || input.listingId || "").trim();
  if (!propertyId || !classifyPriceChange(input.prevPrice, input.nextPrice)) return 0;

  const leadIds = new Set<string>();
  if (input.leadId) leadIds.add(input.leadId);
  const { data: matches } = await db
    .from("lead_property_matches")
    .select("lead_id, property_title")
    .eq("property_id", propertyId)
    .limit(MAX_WRITES);
  let titleFromMatch: string | null = input.propertyTitle ?? null;
  if (Array.isArray(matches)) {
    for (const row of matches) {
      if (typeof row.lead_id === "string") leadIds.add(row.lead_id);
      if (!titleFromMatch && typeof row.property_title === "string") titleFromMatch = row.property_title;
    }
  }

  let wrote = 0;
  for (const leadId of leadIds) {
    if (wrote >= MAX_WRITES) break;
    const lead = await loadLead(db, leadId);
    const step = buildReturnStep({
      kind: "price_change",
      propertyId,
      propertyTitle: titleFromMatch,
      contactName: lead?.name,
      prevPrice: input.prevPrice,
      nextPrice: input.nextPrice,
    });
    if (!step) continue;
    if (await writeForLead(db, leadId, step, propertyId)) wrote++;
  }
  return wrote;
}

export async function recordRepeatView(
  db: LooseDb,
  payload: Record<string, unknown> | null | undefined,
): Promise<WriteReturnStepResult> {
  const target = readViewTarget(payload);
  if (!target) return { wrote: false, reason: "not_a_known_view" };

  const { count, error } = await db
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "property_viewed")
    .or(
      `and(payload->>lead_id.eq.${target.leadId},payload->>property_id.eq.${target.propertyId}),and(payload->>leadId.eq.${target.leadId},payload->>propertyId.eq.${target.propertyId})`,
    );
  if (error) return { wrote: false, reason: error.message };
  const total = typeof count === "number" ? count : 0;
  if (!classifyRepeatView(total - 1)) return { wrote: false, reason: "first_view" };

  const { data: props } = await db
    .from("properties")
    .select("title")
    .eq("id", target.propertyId)
    .limit(1);
  const propertyTitle = Array.isArray(props) && props[0] ? String(props[0].title ?? "") : null;
  const lead = await loadLead(db, target.leadId);
  const step = buildReturnStep({
    kind: "repeat_view",
    propertyId: target.propertyId,
    propertyTitle,
    contactName: lead?.name,
  });
  if (!step) return { wrote: false, reason: "no_step" };
  return writeReturnStep(db, { leadId: target.leadId, step, propertyId: target.propertyId });
}

export async function scanListingAge(db: LooseDb, now = new Date()): Promise<{ considered: number; wrote: number }> {
  const from = new Date(now.getTime() - 62 * 86_400_000).toISOString();
  const to = new Date(now.getTime() - 14 * 86_400_000).toISOString();
  const { data: properties, error } = await db
    .from("properties")
    .select("id, title, status, created_at")
    .gte("created_at", from)
    .lte("created_at", to)
    .limit(200);
  if (error || !Array.isArray(properties)) return { considered: 0, wrote: 0 };

  const due = properties.filter((row) => {
    if (!ACTIVE_PROPERTY.has(String(row.status ?? ""))) return false;
    const age = ageDaysSince(String(row.created_at ?? ""), now);
    return age != null && listingAgeBucket(age) != null;
  });
  if (due.length === 0) return { considered: 0, wrote: 0 };

  const ids = due.map((row) => String(row.id));
  const { data: matches } = await db
    .from("lead_property_matches")
    .select("lead_id, property_id, property_title")
    .in("property_id", ids)
    .limit(200);
  if (!Array.isArray(matches)) return { considered: due.length, wrote: 0 };

  const byId = new Map(due.map((row) => [String(row.id), row]));
  let wrote = 0;
  for (const match of matches) {
    if (wrote >= MAX_WRITES) break;
    const property = byId.get(String(match.property_id ?? ""));
    if (!property || typeof match.lead_id !== "string") continue;
    const age = ageDaysSince(String(property.created_at), now);
    const bucket = age == null ? null : listingAgeBucket(age);
    const lead = await loadLead(db, match.lead_id);
    const step = buildReturnStep({
      kind: "listing_age" satisfies ReturnSignalKind,
      propertyId: String(property.id),
      propertyTitle: match.property_title || property.title,
      contactName: lead?.name,
      ageBucket: bucket,
    });
    if (!step) continue;
    if (await writeForLead(db, match.lead_id, step, String(property.id))) wrote++;
  }
  return { considered: due.length, wrote };
}
