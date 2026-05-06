import type { Lead, LeadStage, LeadIntent, LeadPersona, LeadPriority } from "@revolis/mcp-shared";

// Seed data — replace with Supabase queries in production.
const LEADS: Map<string, Lead> = new Map([
  [
    "lead-001",
    {
      id: "lead-001",
      first_name: "Marta",
      last_name: "Kováčová",
      email: "marta.kovacova@example.sk",
      phone: "+421905111222",
      source: "portal-nehnutelnosti",
      stage: "CONTACTED",
      intent: "BUY_NOW",
      persona: "FAMILY",
      priority: "HIGH",
      assigned_agent_id: "agent-001",
      listing_id: "listing-042",
      created_at: "2026-04-10T09:00:00Z",
      updated_at: "2026-05-01T14:30:00Z",
      metadata: {},
    },
  ],
  [
    "lead-002",
    {
      id: "lead-002",
      first_name: "Peter",
      last_name: "Novák",
      email: "peter.novak@example.sk",
      phone: "+421902333444",
      source: "facebook-ad",
      stage: "NEW",
      intent: "INVESTOR",
      persona: "INVESTOR",
      priority: "MEDIUM",
      assigned_agent_id: undefined,
      listing_id: undefined,
      created_at: "2026-05-05T11:00:00Z",
      updated_at: "2026-05-05T11:00:00Z",
      metadata: {},
    },
  ],
]);

export function getLead(id: string): Lead | undefined {
  return LEADS.get(id);
}

export function updateLead(id: string, patch: Partial<Omit<Lead, "id" | "created_at">>): Lead | undefined {
  const lead = LEADS.get(id);
  if (!lead) return undefined;
  const updated: Lead = {
    ...lead,
    ...patch,
    id: lead.id,
    created_at: lead.created_at,
    updated_at: new Date().toISOString(),
  };
  LEADS.set(id, updated);
  return updated;
}

export interface LeadFilter {
  stage?: LeadStage;
  intent?: LeadIntent;
  persona?: LeadPersona;
  priority?: LeadPriority;
  assigned_agent_id?: string;
  source?: string;
  limit?: number;
  offset?: number;
}

export function listLeadsByFilter(filter: LeadFilter): { leads: Lead[]; total: number } {
  let results = Array.from(LEADS.values());

  if (filter.stage)             results = results.filter((l) => l.stage === filter.stage);
  if (filter.intent)            results = results.filter((l) => l.intent === filter.intent);
  if (filter.persona)           results = results.filter((l) => l.persona === filter.persona);
  if (filter.priority)          results = results.filter((l) => l.priority === filter.priority);
  if (filter.assigned_agent_id) results = results.filter((l) => l.assigned_agent_id === filter.assigned_agent_id);
  if (filter.source)            results = results.filter((l) => l.source === filter.source);

  const total = results.length;
  const offset = filter.offset ?? 0;
  const limit = filter.limit ?? 50;
  return { leads: results.slice(offset, offset + limit), total };
}
