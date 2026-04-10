// jednotný enum statusov (budúci štandard – EN)
export const LeadStatusEnum = {
  NEW: "new",
  WARM: "warm",
  HOT: "hot",
  VIEWING: "viewing",
  OFFER: "offer",
} as const;

// mapovanie DB (SK) → internal (EN)
export const dbToInternalStatusMap: Record<string, string> = {
  "Nový": LeadStatusEnum.NEW,
  "Teplý": LeadStatusEnum.WARM,
  "Horúci": LeadStatusEnum.HOT,
  "Obhliadka": LeadStatusEnum.VIEWING,
  "Ponuka": LeadStatusEnum.OFFER,
};

// mapovanie internal (EN) → UI label (SK)
export const internalToUILabelMap: Record<string, string> = {
  [LeadStatusEnum.NEW]: "Nový",
  [LeadStatusEnum.WARM]: "Teplý",
  [LeadStatusEnum.HOT]: "Horúci",
  [LeadStatusEnum.VIEWING]: "Obhliadka",
  [LeadStatusEnum.OFFER]: "Ponuka",
};

// reverse mapping (EN → DB SK)
export const internalToDbStatusMap: Record<string, string> = {
  [LeadStatusEnum.NEW]: "Nový",
  [LeadStatusEnum.WARM]: "Teplý",
  [LeadStatusEnum.HOT]: "Horúci",
  [LeadStatusEnum.VIEWING]: "Obhliadka",
  [LeadStatusEnum.OFFER]: "Ponuka",
};

// Helpery
export function getInternalStatus(dbStatus: string) {
  return dbToInternalStatusMap[dbStatus] || LeadStatusEnum.NEW;
}

export function getUILabel(internalStatus: string) {
  return internalToUILabelMap[internalStatus] || "Nový";
}

export function getDbStatus(internalStatus: string) {
  return internalToDbStatusMap[internalStatus] || "Nový";
}

import { supabaseClient } from "@/lib/supabase/client";
import {
  leads as mockLeads,
  recommendations as mockRecommendations,
  type Lead,
  type LeadStatus,
  type Recommendation,
} from "@/lib/mock-data";

export type { Lead, LeadStatus, Recommendation } from "@/lib/mock-data";

export const leadStatusOptions: LeadStatus[] = [
  "Nový",
  "Teplý",
  "Horúci",
  "Obhliadka",
  "Ponuka",
];

export const propertyTypeOptions = ["Byt", "Dom", "Pozemok", "Komerčný priestor"];
export const financingOptions = ["Hypotéka", "Hotovosť", "Kombinácia"];
export const timelineOptions = ["Ihneď", "Do 1 mesiaca", "Do 2 mesiacov", "Do 3 mesiacov", "Do 6 mesiacov"];
export const sourceOptions = ["Web formulár", "Facebook Ads", "Google Ads", "Chatbot", "Odporúčanie", "Portál"];

export type LeadFilters = {
  q?: string;
  status?: string;
  location?: string;
  minScore?: number;
};

export type LeadInput = {
  name: string;
  email: string;
  phone: string;
  location: string;
  budget: string;
  propertyType: string;
  rooms: string;
  financing: string;
  timeline: string;
  source: string;
  status: LeadStatus;
  score: number;
  assignedAgent: string;
  assignedProfileId?: string | null;
  note: string;
};

export type ActivityType = "Email" | "Telefonat" | "Obhliadka";

export const aiRecommendationPriorityOptions = ["high", "medium", "low"] as const;
export const aiRecommendationStatusOptions = ["active", "inactive"] as const;

export type AiRecommendationPriority =
  (typeof aiRecommendationPriorityOptions)[number];

export type AiRecommendationStatus =
  (typeof aiRecommendationStatusOptions)[number];

export type AiRecommendationType =
  | "assignment"
  | "follow_up_offer"
  | "showing_confirmation"
  | "next_best_action"
  | "personalized_offer"
  | "custom";

export type AiRecommendationAdminItem = {
  id: string;
  leadId: string;
  recommendationType: AiRecommendationType;
  title: string;
  description: string;
  priority: AiRecommendationPriority;
  status: AiRecommendationStatus;
  modelVersion: string;
  createdAt: string;
};

export type AiRecommendationInput = {
  leadId: string;
  recommendationType: AiRecommendationType;
  title: string;
  description: string;
  priority: AiRecommendationPriority;
  status?: AiRecommendationStatus;
  modelVersion?: string;
};

export type AiRecommendationAuditItem = {
  id: string;
  leadId: string;
  leadName: string;
  action: "created" | "updated" | "activated" | "deactivated";
  text: string;
  date: string;
};

export type LeadActivity = {
  id: string;
  type: ActivityType;
  text: string;
  date: string;
};

type ActivityMeta = {
  category?: string;
  action?: string;
  entityId?: string;
  entityType?: string;
};

type ActivityLogInput = {
  activityType?: ActivityType;
  activityText?: string;
};

type SupabaseLeadRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  budget: string;
  property_type: string;
  rooms: string;
  financing: string;
  timeline: string;
  source: string;
  status: string;
  score: number;
  assigned_agent: string;
  assigned_profile_id?: string | null;
  last_contact: string;
  note: string;
  created_at?: string;
  client_segment?: string | null;
  buyer_readiness_score?: number | null;
};

type SupabaseActivityRow = {
  id: string;
  lead_id: string;
  type: string;
  text: string;
  created_at: string;
  meta?: ActivityMeta | null;
};

type SupabaseAiRecommendationRow = {
  id: string;
  lead_id: string;
  recommendation_type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  model_version: string;
  created_at: string;
};

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return supabaseClient;
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  );
}

function mapRowToLead(row: SupabaseLeadRow): Lead {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    location: row.location,
    budget: row.budget,
    propertyType: row.property_type,
    rooms: row.rooms,
    financing: row.financing,
    timeline: row.timeline,
    source: row.source,
    status: (leadStatusOptions.includes(row.status as LeadStatus)
      ? row.status
      : "Nový") as LeadStatus,
    score: Number(row.score ?? 0),
    assignedAgent: row.assigned_agent,
    assignedProfileId: row.assigned_profile_id ?? null,
    lastContact: row.last_contact || "Bez kontaktu",
    note: row.note || "",
    client_segment: row.client_segment ?? null,
    buyer_readiness_score: row.buyer_readiness_score ?? null,
  };
}

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function formatActivityDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeActivityType(type: string): ActivityType {
  if (type === "Email") return "Email";
  if (type === "Obhliadka") return "Obhliadka";
  return "Telefonat";
}

function mapRecommendationPriority(priority: string): Recommendation["priority"] {
  if (priority === "high") return "Vysoká";
  if (priority === "medium") return "Stredná";
  return "Nízka";
}

function normalizeRecommendationPriority(priority: string): AiRecommendationPriority {
  if (priority === "high") return "high";
  if (priority === "medium") return "medium";
  return "low";
}

function normalizeRecommendationStatus(status: string): AiRecommendationStatus {
  return status === "inactive" ? "inactive" : "active";
}

function normalizeRecommendationType(type: string): AiRecommendationType {
  if (
    type === "assignment" ||
    type === "follow_up_offer" ||
    type === "showing_confirmation" ||
    type === "next_best_action" ||
    type === "personalized_offer"
  ) {
    return type;
  }

  return "custom";
}

function mapRecommendationRow(row: SupabaseAiRecommendationRow): Recommendation {
  return {
    id: row.id,
    leadId: row.lead_id,
    title: row.title,
    description: row.description,
    priority: mapRecommendationPriority(row.priority),
  };
}

function mapRecommendationAdminRow(
  row: SupabaseAiRecommendationRow
): AiRecommendationAdminItem {
  return {
    id: row.id,
    leadId: row.lead_id,
    recommendationType: normalizeRecommendationType(row.recommendation_type),
    title: row.title,
    description: row.description,
    priority: normalizeRecommendationPriority(row.priority),
    status: normalizeRecommendationStatus(row.status),
    modelVersion: row.model_version,
    createdAt: row.created_at,
  };
}

function buildRecommendationSeeds(leads: Lead[]) {
  return leads
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((lead) => {
      if (!lead.assignedProfileId && lead.assignedAgent === "Nepriradený") {
        return {
          leadId: lead.id,
          recommendationType: "assignment",
          title: "Priradiť lead agentovi",
          description: "Lead ešte nemá vlastníka. Priradenie zvýši šancu na rýchly follow-up.",
          priority: "high",
        };
      }

      if (lead.status === "Ponuka") {
        return {
          leadId: lead.id,
          recommendationType: "follow_up_offer",
          title: "Získať spätnú väzbu k ponuke",
          description: "Lead je vo fáze Ponuka. Overte reakciu klienta a ďalší postup.",
          priority: "high",
        };
      }

      if (lead.status === "Obhliadka") {
        return {
          leadId: lead.id,
          recommendationType: "showing_confirmation",
          title: "Potvrdiť obhliadku",
          description: "Pred termínom obhliadky pošlite potvrdenie a doplňujúce informácie.",
          priority: "medium",
        };
      }

      if (lead.score >= 85 || lead.timeline === "Ihneď") {
        return {
          leadId: lead.id,
          recommendationType: "next_best_action",
          title: "Kontaktovať klienta dnes",
          description: "Lead má veľmi vysoké skóre alebo urgentný časový horizont. Priorita je okamžitý follow-up.",
          priority: "high",
        };
      }

      return {
        leadId: lead.id,
        recommendationType: "personalized_offer",
        title: "Poslať personalizovanú ponuku",
        description: "Lead je pripravený na ďalší krok. Vyberte 2-3 najvhodnejšie nehnuteľnosti.",
        priority: "medium",
      };
    });
}

async function ensureAiRecommendations(
  supabase: NonNullable<ReturnType<typeof getSupabaseClient>>
) {
  const { data, error } = await supabase
    .from("ai_recommendations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase ai_recommendations error:", error.message);
    return mockRecommendations;
  }

  const rows = (data ?? []) as SupabaseAiRecommendationRow[];

  if (rows.length > 0) {
    return rows
      .filter((row) => normalizeRecommendationStatus(row.status) === "active")
      .map(mapRecommendationRow);
  }

  const leads = await listLeads();
  const seeds = buildRecommendationSeeds(leads);

  if (seeds.length === 0) {
    return mockRecommendations;
  }

  const insertRows = seeds.map((seed) => ({
    id: crypto.randomUUID(),
    lead_id: seed.leadId,
    recommendation_type: seed.recommendationType,
    title: seed.title,
    description: seed.description,
    priority: seed.priority,
    status: "active",
    model_version: "v1",
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("ai_recommendations")
    .insert(insertRows)
    .select("*");

  if (insertError) {
    console.error("Supabase ai_recommendations insert error:", insertError.message);
    return mockRecommendations;
  }

  return (inserted ?? []).map((row) => mapRecommendationRow(row as SupabaseAiRecommendationRow));
}

function validateAiRecommendationInput(input: Partial<AiRecommendationInput>) {
  if (input.leadId !== undefined && !input.leadId.trim()) {
    throw new Error("Lead je povinný.");
  }

  if (input.title !== undefined && !input.title.trim()) {
    throw new Error("Názov odporúčania je povinný.");
  }

  if (input.description !== undefined && !input.description.trim()) {
    throw new Error("Popis odporúčania je povinný.");
  }

  if (
    input.priority !== undefined &&
    !aiRecommendationPriorityOptions.includes(input.priority)
  ) {
    throw new Error("Neplatná priorita odporúčania.");
  }

  if (
    input.status !== undefined &&
    !aiRecommendationStatusOptions.includes(input.status)
  ) {
    throw new Error("Neplatný stav odporúčania.");
  }
}

export async function listAiRecommendationsAdmin(): Promise<AiRecommendationAdminItem[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return mockRecommendations.map((item) => ({
      id: item.id,
      leadId: item.leadId,
      recommendationType: "custom",
      title: item.title,
      description: item.description,
      priority:
        item.priority === "Vysoká"
          ? "high"
          : item.priority === "Stredná"
            ? "medium"
            : "low",
      status: "active",
      modelVersion: "mock",
      createdAt: new Date().toISOString(),
    }));
  }

  const { data, error } = await supabase
    .from("ai_recommendations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase listAiRecommendationsAdmin error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapRecommendationAdminRow(row as SupabaseAiRecommendationRow));
}

export async function getAiRecommendationById(
  id: string
): Promise<AiRecommendationAdminItem | undefined> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const items = await listAiRecommendationsAdmin();
    return items.find((item) => item.id === id);
  }

  const { data, error } = await supabase
    .from("ai_recommendations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return undefined;
  }

  return mapRecommendationAdminRow(data as SupabaseAiRecommendationRow);
}

export async function createAiRecommendation(
  input: AiRecommendationInput
): Promise<AiRecommendationAdminItem> {
  validateAiRecommendationInput(input);

  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      id: crypto.randomUUID(),
      leadId: input.leadId,
      recommendationType: input.recommendationType,
      title: input.title.trim(),
      description: input.description.trim(),
      priority: input.priority,
      status: input.status ?? "active",
      modelVersion: input.modelVersion?.trim() || "manual",
      createdAt: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase
    .from("ai_recommendations")
    .insert({
      id: crypto.randomUUID(),
      lead_id: input.leadId.trim(),
      recommendation_type: input.recommendationType,
      title: input.title.trim(),
      description: input.description.trim(),
      priority: input.priority,
      status: input.status ?? "active",
      model_version: input.modelVersion?.trim() || "manual",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRecommendationAdminRow(data as SupabaseAiRecommendationRow);
}

export async function updateAiRecommendation(
  id: string,
  input: Partial<AiRecommendationInput>
): Promise<AiRecommendationAdminItem> {
  validateAiRecommendationInput(input);

  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase nie je nastavený.");
  }

  const payload: Partial<SupabaseAiRecommendationRow> = {};

  if (input.leadId !== undefined) payload.lead_id = input.leadId.trim();
  if (input.recommendationType !== undefined) {
    payload.recommendation_type = input.recommendationType;
  }
  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.description !== undefined) payload.description = input.description.trim();
  if (input.priority !== undefined) payload.priority = input.priority;
  if (input.status !== undefined) payload.status = input.status;
  if (input.modelVersion !== undefined) payload.model_version = input.modelVersion.trim();

  const { data, error } = await supabase
    .from("ai_recommendations")
    .update(payload)
    .eq("id", id)
    .select("*");

  // Logovanie pre debug
  // eslint-disable-next-line no-console
  console.log('updateAiRecommendation:', { id, payload, data, error });

  if (error) {
    throw new Error(error.message);
  }

  if (Array.isArray(data) && data.length === 1) {
    return mapRecommendationAdminRow(data[0] as SupabaseAiRecommendationRow);
  }
  if (data && !Array.isArray(data)) {
    return mapRecommendationAdminRow(data as SupabaseAiRecommendationRow);
  }
  throw new Error('updateAiRecommendation: Unexpected data format: ' + JSON.stringify(data));
}

async function appendActivity(
  leadId: string,
  text: string,
  type: ActivityType = "Telefonat",
  meta?: ActivityMeta
) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return;
  }

  const { error } = await supabase.from("activities").insert({
    lead_id: leadId,
    type,
    text,
    ...(meta ? { meta } : {}),
  });

  if (error) {
    console.error("Supabase appendActivity error:", error.message);
  }
}

export async function addLeadActivity(
  leadId: string,
  text: string,
  type: ActivityType = "Telefonat",
  meta?: ActivityMeta
) {
  await appendActivity(leadId, text, type, meta);
}

function applyFilters(items: Lead[], filters?: LeadFilters) {
  let result = [...items];

  if (filters?.q) {
    const q = normalize(filters.q);

    result = result.filter((lead) =>
      [
        lead.name,
        lead.email,
        lead.phone,
        lead.location,
        lead.budget,
        lead.status,
        lead.assignedAgent,
        lead.source,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  if (filters?.status) {
    result = result.filter((lead) => lead.status === filters.status);
  }

  if (filters?.location) {
    const location = normalize(filters.location);
    result = result.filter((lead) =>
      lead.location.toLowerCase().includes(location)
    );
  }

  if (typeof filters?.minScore === "number" && !Number.isNaN(filters.minScore)) {
    result = result.filter((lead) => lead.score >= filters.minScore!);
  }

  return result.sort((a, b) => b.score - a.score);
}

export function getAvailableLocations(items: Lead[]) {
  return [...new Set(items.map((lead) => lead.location))].sort((a, b) =>
    a.localeCompare(b, "sk")
  );
}

export async function listLeads(filters?: LeadFilters): Promise<Lead[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return applyFilters(mockLeads, filters);
  }

  let query = supabase
    .from("leads")
    .select("*")
    .order("score", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.location) {
    query = query.ilike("location", `%${filters.location}%`);
  }

  if (typeof filters?.minScore === "number" && !Number.isNaN(filters.minScore)) {
    query = query.gte("score", filters.minScore);
  }

  if (filters?.q) {
    const q = filters.q.replace(/,/g, " ");
    query = query.or(
      `name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,location.ilike.%${q}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Supabase listLeads error, using mock fallback:", error.message);
    return applyFilters(mockLeads, filters);
  }

  return (data ?? []).map((row) => mapRowToLead(row as SupabaseLeadRow));
}

export async function getLead(id: string): Promise<Lead | undefined> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return mockLeads.find((lead) => lead.id === id);
  }

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return mockLeads.find((lead) => lead.id === id);
  }

  return mapRowToLead(data as SupabaseLeadRow);
}

export async function createLead(input: LeadInput & ActivityLogInput) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const lead: Lead = {
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email,
      phone: input.phone,
      location: input.location,
      budget: input.budget,
      propertyType: input.propertyType,
      rooms: input.rooms,
      financing: input.financing,
      timeline: input.timeline,
      source: input.source,
      status: input.status,
      score: Number(input.score),
      assignedAgent: input.assignedAgent || "Nepriradený",
      assignedProfileId: input.assignedProfileId ?? null,
      lastContact: "Práve vytvorený",
      note: input.note,
    };

    mockLeads.unshift(lead);
    return lead;
  }

  let assignedAgentName = input.assignedAgent || "Nepriradený";

  if (input.assignedProfileId) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", input.assignedProfileId)
      .maybeSingle();

    assignedAgentName = profileData?.full_name ?? assignedAgentName;
  }

  const payload: SupabaseLeadRow = {
    id: crypto.randomUUID(),
    name: input.name,
    email: input.email,
    phone: input.phone,
    location: input.location,
    budget: input.budget,
    property_type: input.propertyType,
    rooms: input.rooms,
    financing: input.financing,
    timeline: input.timeline,
    source: input.source,
    status: input.status,
    score: Number(input.score),
    assigned_agent: assignedAgentName,
    assigned_profile_id: input.assignedProfileId ?? null,
    last_contact: "Práve vytvorený",
    note: input.note,
  };

  const { data, error } = await supabase
    .from("leads")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await appendActivity(
    payload.id,
    input.activityText || `Nový lead prijatý (${input.propertyType}, ${input.rooms}, rozpočet ${input.budget}).`,
    input.activityType || "Email"
  );

  return mapRowToLead(data as SupabaseLeadRow);
}

export async function updateLead(
  id: string,
  input: Partial<
    LeadInput & {
      lastContact: string;
      assignedProfileId: string | null;
    } & ActivityLogInput
  >
) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const index = mockLeads.findIndex((lead) => lead.id === id);

    if (index === -1) {
      throw new Error("Lead sa nenašiel.");
    }

    const current = mockLeads[index];
    const updated: Lead = {
      ...current,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.budget !== undefined ? { budget: input.budget } : {}),
      ...(input.propertyType !== undefined ? { propertyType: input.propertyType } : {}),
      ...(input.rooms !== undefined ? { rooms: input.rooms } : {}),
      ...(input.financing !== undefined ? { financing: input.financing } : {}),
      ...(input.timeline !== undefined ? { timeline: input.timeline } : {}),
      ...(input.source !== undefined ? { source: input.source } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(typeof input.score === "number" ? { score: input.score } : {}),
      ...(input.assignedAgent !== undefined
        ? { assignedAgent: input.assignedAgent || "Nepriradený" }
        : {}),
      ...(input.assignedProfileId !== undefined
        ? { assignedProfileId: input.assignedProfileId }
        : {}),
      ...(input.lastContact !== undefined ? { lastContact: input.lastContact } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
    };

    mockLeads[index] = updated;
    return updated;
  }

  const { data: beforeData } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  let assignedAgentName = input.assignedAgent;

  if (input.assignedProfileId) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", input.assignedProfileId)
      .maybeSingle();

    assignedAgentName = profileData?.full_name ?? input.assignedAgent ?? "Priradený agent";
  }

  const payload: Partial<SupabaseLeadRow> = {
    ...(input.name ? { name: input.name } : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(input.phone ? { phone: input.phone } : {}),
    ...(input.location ? { location: input.location } : {}),
    ...(input.budget ? { budget: input.budget } : {}),
    ...(input.propertyType ? { property_type: input.propertyType } : {}),
    ...(input.rooms ? { rooms: input.rooms } : {}),
    ...(input.financing ? { financing: input.financing } : {}),
    ...(input.timeline ? { timeline: input.timeline } : {}),
    ...(input.source ? { source: input.source } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(typeof input.score === "number" ? { score: input.score } : {}),
    ...(assignedAgentName ? { assigned_agent: assignedAgentName } : {}),
    ...(input.assignedProfileId !== undefined
      ? { assigned_profile_id: input.assignedProfileId }
      : {}),
    ...(input.lastContact ? { last_contact: input.lastContact } : {}),
    ...(typeof input.note === "string" ? { note: input.note } : {}),
  };

  const { data, error } = await supabase
    .from("leads")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const before = beforeData as SupabaseLeadRow | null;
  const changes: string[] = [];

  if (input.status && before?.status !== input.status) {
    changes.push(`stav ${before?.status ?? "?"} -> ${input.status}`);
  }
  if (typeof input.score === "number" && Number(before?.score) !== input.score) {
    changes.push(`score ${before?.score ?? 0} -> ${input.score}`);
  }
  if (typeof input.note === "string" && before?.note !== input.note) {
    changes.push("poznámka upravená");
  }
  if (assignedAgentName && before?.assigned_agent !== assignedAgentName) {
    changes.push(`maklér ${before?.assigned_agent ?? "Nepriradený"} -> ${assignedAgentName}`);
  }

  await appendActivity(
    id,
    input.activityText || (
      changes.length > 0
        ? `Lead aktualizovaný: ${changes.join(", ")}.`
        : "Lead aktualizovaný cez formulár."
    ),
    input.activityType || (input.status === "Obhliadka" ? "Obhliadka" : "Telefonat")
  );

  return mapRowToLead(data as SupabaseLeadRow);
}

export async function deleteLead(id: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const index = mockLeads.findIndex((lead) => lead.id === id);

    if (index === -1) {
      throw new Error("Lead sa nenašiel.");
    }

    mockLeads.splice(index, 1);
    return { success: true };
  }

  const { error } = await supabase.from("leads").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  return { success: true };
}

// Compatibility exports for existing code
export async function getLeads(): Promise<Lead[]> {
  return listLeads();
}

export async function getRecommendations() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return mockRecommendations;
  }

  return ensureAiRecommendations(supabase);
}

export async function getLeadById(id: string): Promise<Lead | undefined> {
  return getLead(id);
}

export async function getActivitiesByLeadId(id: string): Promise<LeadActivity[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return [
      {
        id: "1",
        type: "Email",
        text: "Lead vytvorený cez web formulár",
        date: "Dnes 10:30",
      },
      {
        id: "2",
        type: "Telefonat",
        text: "Email s ponukami odoslaný",
        date: "Včera 14:20",
      },
      {
        id: "3",
        type: "Obhliadka",
        text: "Telefónny hovor - záujem o obhliadku",
        date: "Pred 3 dňami",
      },
    ];
  }

  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase getActivitiesByLeadId error:", error.message);
    return [];
  }

  return (data as SupabaseActivityRow[]).map((item) => ({
    id: item.id,
    type: normalizeActivityType(item.type),
    text: item.text,
    date: formatActivityDate(item.created_at),
  }));
}

export async function listAiRecommendationAuditTrail(
  limit = 12
): Promise<AiRecommendationAuditItem[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return [];
  }

  const [activitiesResult, leads] = await Promise.all([
    supabase
      .from("activities")
      .select("id, lead_id, type, text, created_at, meta")
      .contains("meta", { category: "ai_recommendation" })
      .order("created_at", { ascending: false })
      .limit(limit),
    listLeads(),
  ]);

  if (activitiesResult.error) {
    console.error(
      "Supabase listAiRecommendationAuditTrail error:",
      activitiesResult.error.message
    );
    return [];
  }

  const leadMap = new Map(leads.map((lead) => [lead.id, lead.name]));

  return ((activitiesResult.data ?? []) as SupabaseActivityRow[]).map((item) => ({
    id: item.id,
    leadId: item.lead_id,
    leadName: leadMap.get(item.lead_id) ?? "Neznámy lead",
    action:
      item.meta?.action === "created" ||
      item.meta?.action === "activated" ||
      item.meta?.action === "deactivated"
        ? item.meta.action
        : "updated",
    text: item.text,
    date: formatActivityDate(item.created_at),
  }));
}

export async function getAiRecommendationAuditByLeadId(
  leadId: string,
  limit = 8
): Promise<AiRecommendationAuditItem[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return [];
  }

  const lead = await getLead(leadId);
  const { data, error } = await supabase
    .from("activities")
    .select("id, lead_id, type, text, created_at, meta")
    .eq("lead_id", leadId)
    .contains("meta", { category: "ai_recommendation" })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Supabase getAiRecommendationAuditByLeadId error:", error.message);
    return [];
  }

  return ((data ?? []) as SupabaseActivityRow[]).map((item) => ({
    id: item.id,
    leadId: item.lead_id,
    leadName: lead?.name ?? "Neznámy lead",
    action:
      item.meta?.action === "created" ||
      item.meta?.action === "activated" ||
      item.meta?.action === "deactivated"
        ? item.meta.action
        : "updated",
    text: item.text,
    date: formatActivityDate(item.created_at),
  }));
}

export async function logMatchingActivity(
  leadId: string,
  propertyTitle: string,
  propertyLocation: string
) {
  await appendActivity(
    leadId,
    `Matching: odoslaná ponuka '${propertyTitle}' (${propertyLocation}).`,
    "Email"
  );

  return { ok: true };
}

export async function getRecommendationsByLeadId(id: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return mockRecommendations.filter((item) => item.leadId === id);
  }

  const ensured = await ensureAiRecommendations(supabase);
  return ensured.filter((item) => item.leadId === id);
}

export type PipelineMove = {
  id: string;
  leadId: string;
  leadName: string;
  fromStatus: string;
  toStatus: string;
  changedAt: string;
};

export async function appendPipelineMove(
  leadId: string,
  leadName: string,
  fromStatus: string,
  toStatus: string
) {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("pipeline_moves").insert({
    lead_id: leadId,
    lead_name: leadName,
    from_status: fromStatus,
    to_status: toStatus,
  });

  if (error) console.error("appendPipelineMove error:", error.message);
}

export async function getPipelineMovesByLeadId(leadId: string): Promise<PipelineMove[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("pipeline_moves")
    .select("*")
    .eq("lead_id", leadId)
    .order("changed_at", { ascending: false });

  if (error) {
    console.error("getPipelineMovesByLeadId error:", error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, string>) => ({
    id: row.id,
    leadId: row.lead_id,
    leadName: row.lead_name,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    changedAt: formatActivityDate(row.changed_at),
  }));
}

// AI Recommendation Metrics
export type AiRecommendationMetric = {
  activated: number;
  deactivated: number;
  created: number;
  updated: number;
  total: number;
};

export type AiRecommendationMetricsTimeline = {
  date: string;
  activated: number;
  deactivated: number;
  created: number;
};

export async function getAiRecommendationMetricsForToday(): Promise<AiRecommendationMetric> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { activated: 0, deactivated: 0, created: 0, updated: 0, total: 0 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data, error } = await supabase
    .from("activities")
    .select("meta")
    .gte("created_at", today.toISOString())
    .lt("created_at", tomorrow.toISOString())
    .contains("meta", { category: "ai_recommendation" });

  if (error) {
    console.error("getAiRecommendationMetricsForToday error:", error.message);
    return { activated: 0, deactivated: 0, created: 0, updated: 0, total: 0 };
  }

  const metrics = { activated: 0, deactivated: 0, created: 0, updated: 0, total: 0 };

  (data ?? []).forEach((row: { meta?: ActivityMeta | null }) => {
    if (!row.meta?.action) return;
    
    if (row.meta.action === "activated") metrics.activated++;
    else if (row.meta.action === "deactivated") metrics.deactivated++;
    else if (row.meta.action === "created") metrics.created++;
    else if (row.meta.action === "updated") metrics.updated++;
  });

  metrics.total = metrics.activated + metrics.deactivated + metrics.created + metrics.updated;
  return metrics;
}

export async function getAiRecommendationMetricsLast7Days(): Promise<AiRecommendationMetricsTimeline[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return [];
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const { data, error } = await supabase
    .from("activities")
    .select("created_at, meta")
    .gte("created_at", sevenDaysAgo.toISOString())
    .contains("meta", { category: "ai_recommendation" })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getAiRecommendationMetricsLast7Days error:", error.message);
    return [];
  }

  const metricsMap = new Map<string, AiRecommendationMetricsTimeline>();

  (data ?? []).forEach((row: any) => {
    const date = new Date(row.created_at);
    const dateKey = date.toLocaleDateString("sk-SK");

    if (!metricsMap.has(dateKey)) {
      metricsMap.set(dateKey, {
        date: dateKey,
        activated: 0,
        deactivated: 0,
        created: 0,
      });
    }

    const metrics = metricsMap.get(dateKey)!;
    if (row.meta?.action === "activated") metrics.activated++;
    else if (row.meta?.action === "deactivated") metrics.deactivated++;
    else if (row.meta?.action === "created") metrics.created++;
  });

  return Array.from(metricsMap.values());
}
