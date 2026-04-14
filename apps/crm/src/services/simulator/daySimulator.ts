/**
 * AI Day Simulator – generuje denný Playbook z reálnych Supabase dát.
 * Používa BRI engine (pure funkcia) – žiadne Prisma, žiadny ORM.
 *
 * Vstup: Supabase client (server-side, RLS platí)
 * Výstup: PlaybookItemDto[] zoradené podľa BRI DESC
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { computeBuyerReadiness } from "@/domain/buyer-readiness/engine";
import type { PlaybookItemDto } from "@/services/playbook/types";
import type { PlaybookItemType } from "@/ui/playbook/components.map";

const BRI_THRESHOLD = 70;

export async function generateDailyPlaybook(
  supabase: SupabaseClient,
  limit = 40
): Promise<PlaybookItemDto[]> {
  // ── 1. Načítaj leady zoradené podľa score DESC ────────────
  const { data: leads, error } = await supabase
    .from("leads")
    .select(
      "id, name, location, status, score, budget, property_type, rooms, last_contact_at, created_at"
    )
    .order("score", { ascending: false })
    .limit(limit);

  if (error || !leads || leads.length === 0) return [];

  // ── 2. Načítaj všetky aktivity naraz ─────────────────────
  const leadIds = leads.map((l) => l.id);
  const { data: activities } = await supabase
    .from("activities")
    .select("id, lead_id, type, source, severity, created_at")
    .in("lead_id", leadIds)
    .order("created_at", { ascending: true });

  // Zoskup aktivity podľa lead_id
  const byLead = new Map<string, typeof activities>();
  for (const act of activities ?? []) {
    const arr = byLead.get(act.lead_id) ?? [];
    arr.push(act);
    byLead.set(act.lead_id, arr);
  }

  // ── 3. BRI engine + filter + mapovanie ───────────────────
  const items: PlaybookItemDto[] = [];

  for (const lead of leads) {
    const leadActivities = (byLead.get(lead.id) ?? []).map((a) => ({
      id: a.id,
      type: a.type ?? "Poznámka",
      source: a.source ?? undefined,
      severity: a.severity ?? undefined,
      createdAt: a.created_at,
    }));

    const bri = computeBuyerReadiness(
      leadActivities,
      {
        status: lead.status ?? "Nový",
        score: lead.score ?? 50,
        budget: lead.budget ?? undefined,
        propertyType: lead.property_type ?? undefined,
        rooms: lead.rooms ?? undefined,
        lastContactAt: lead.last_contact_at ?? undefined,
        createdAt: lead.created_at ?? undefined,
      },
      {
        firstSeenAt: lead.created_at ?? undefined,
        lastActiveAt: lead.last_contact_at ?? undefined,
      }
    );

    if (bri.totalScore < BRI_THRESHOLD) continue;

    const type = resolveType(lead.status, bri.totalScore, bri.segment);

    items.push({
      id: `pb-${lead.id}`,
      leadId: lead.id,
      buyerId: lead.id,
      type,
      buyerName: lead.name,
      buyerScore: bri.totalScore,
      propertyTitle: lead.property_type
        ? `${lead.property_type}${lead.rooms ? `, ${lead.rooms}` : ""}`
        : undefined,
      title: buildTitle(type, lead.name),
      subtitle: buildSubtitle(lead),
      reason: bri.reasons[0] ?? `BRI ${bri.totalScore}/100`,
      badges: buildBadges(bri.segment, bri.totalScore, lead.status),
      ctaLabel: buildCta(type),
      priority: bri.totalScore,
    });
  }

  // ── 4. Zoraď podľa BRI DESC ──────────────────────────────
  items.sort((a, b) => (b.buyerScore ?? 0) - (a.buyerScore ?? 0));

  return items;
}

// ─── Helpers ─────────────────────────────────────────────────

function resolveType(
  status: string,
  total: number,
  segment: string
): PlaybookItemType {
  if (status === "Ponuka" || segment === "HOT_NOW") return "OPPORTUNITY";
  if (status === "Horúci" || total >= 80) return "CALL";
  if (status === "Obhliadka") return "MESSAGE";
  return "CALL";
}

function buildTitle(type: PlaybookItemType, name: string): string {
  switch (type) {
    case "CALL":        return `Zavolaj ${name}`;
    case "MESSAGE":     return `Pošli správu – ${name}`;
    case "RISK":        return `Riziková príležitosť – ${name}`;
    case "OPPORTUNITY": return `Uzavri obchod – ${name}`;
  }
}

function buildSubtitle(lead: {
  location: string | null;
  budget: string | null;
  property_type: string | null;
  rooms: string | null;
}): string {
  return [lead.location, lead.property_type, lead.rooms, lead.budget]
    .filter(Boolean)
    .join(" · ");
}

function buildBadges(segment: string, total: number, status: string): string[] {
  const badges: string[] = [];
  if (segment === "HOT_NOW")       badges.push("HOT NOW");
  if (segment === "HIGH_PRIORITY") badges.push("HIGH PRIORITY");
  if (status === "Ponuka")         badges.push("Ponuka");
  if (status === "Obhliadka")      badges.push("Obhliadka");
  if (total >= 90)                 badges.push("Top BRI");
  return badges;
}

function buildCta(type: PlaybookItemType): string {
  switch (type) {
    case "CALL":        return "Zavolať";
    case "MESSAGE":     return "Napísať";
    case "RISK":        return "Reaktivovať";
    case "OPPORTUNITY": return "Uzavrieť";
  }
}
