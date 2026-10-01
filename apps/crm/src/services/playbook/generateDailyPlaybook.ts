// src/services/playbook/generateDailyPlaybook.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlaybookItemDto } from "@/services/playbook/types";

import {
  LeadSnapshot,
  LeadActivity,
} from "@/domain/playbook/types";
import { buildPlaybook } from "@/domain/playbook/engine";
import { mapActionToDto } from "@/services/playbook/mapper";

const DEFAULT_LIMIT = 40;

const PLACEHOLDER_LAST_CONTACT = new Set([
  "Práve vytvorený",
  "Bez kontaktu",
  "Práve importovaný",
  "Priradené agentovi práve teraz",
]);

/** ISO date from last_contact when stored as timestamp; human labels → undefined. */
export function parseLeadLastContactIso(lastContact: string | null | undefined): string | undefined {
  const raw = String(lastContact ?? "").trim();
  if (!raw || PLACEHOLDER_LAST_CONTACT.has(raw)) return undefined;
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return undefined;
  return new Date(parsed).toISOString();
}

/**
 * Orchestrátor: DB → domain engine → UI DTO.
 * Public API ostáva rovnaké, aby joby a UI nemuseli meniť import.
 */
export async function generateDailyPlaybook(
  supabase: SupabaseClient,
  limit: number = DEFAULT_LIMIT
): Promise<PlaybookItemDto[]> {
  // 1. načítaj leady
  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select(
      "id, name, location, status, score, budget, property_type, rooms, last_contact, created_at"
    )
    .order("score", { ascending: false })
    .limit(limit);

  if (leadsError || !leads || leads.length === 0) return [];

  const leadIds = leads.map((l) => l.id);

  // 2. načítaj aktivity
  const { data: activities } = await supabase
    .from("activities")
    .select("id, lead_id, type, source, severity, created_at")
    .in("lead_id", leadIds)
    .order("created_at", { ascending: true });

  // 3. mapuj raw DB → domain typy
  const snapshots: LeadSnapshot[] = leads.map((lead) => ({
    id: lead.id,
    name: lead.name,
    location: lead.location,
    status: lead.status,
    score: lead.score,
    budget: lead.budget,
    propertyType: lead.property_type,
    rooms: lead.rooms,
    lastContactAt: parseLeadLastContactIso(lead.last_contact) ?? lead.created_at,
    createdAt: lead.created_at,
  }));

  const activityDomain: LeadActivity[] =
    activities?.map((a) => ({
      id: a.id,
      leadId: a.lead_id,
      type: a.type ?? "Poznámka",
      source: a.source ?? undefined,
      severity: a.severity ?? undefined,
      createdAt: a.created_at,
    })) ?? [];

  // 4. domain engine → PlaybookAction[]
  const actions = buildPlaybook(snapshots, activityDomain, {
    threshold: 70,
  });

  // 5. mapovanie na UI DTO
  const items: PlaybookItemDto[] = actions.map((action) => {
    const lead = snapshots.find((l) => l.id === action.leadId)!;
    return mapActionToDto(action, lead);
  });

  return items;
}
