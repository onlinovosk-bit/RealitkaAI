import type { SupabaseClient } from "@supabase/supabase-js";

export const OPEN_DEAL_STATUSES = ["Nový", "Teplý", "Horúci", "Obhliadka", "Ponuka"] as const;

export function getDealTriggerStaleDays(): number {
  return Math.max(1, Number(process.env.DEAL_TRIGGER_STALE_DAYS ?? "7"));
}

/** Prod uses `last_contact` string — NULL/empty = never contacted = urgent. */
export function isLastContactStale(
  lastContact: string | null | undefined,
  staleDays: number,
): boolean {
  const raw = String(lastContact ?? "").trim();
  if (!raw || raw === "Bez kontaktu" || raw === "Práve vytvorený") return true;
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return true;
  const threshold = Date.now() - staleDays * 86_400_000;
  return parsed < threshold;
}

export function countStaleLeads<T extends { status: string; lastContact?: string | null; last_contact?: string | null }>(
  leads: T[],
  staleDays = getDealTriggerStaleDays(),
): number {
  const open = new Set<string>(OPEN_DEAL_STATUSES);
  return leads.filter((l) => {
    if (!open.has(l.status)) return false;
    const lc = l.lastContact ?? l.last_contact;
    return isLastContactStale(lc, staleDays);
  }).length;
}

export async function runDealTrigger(admin: SupabaseClient): Promise<{
  ok: true;
  triggered: number;
  staleDays: number;
  evaluated: number;
}> {
  const staleDays = getDealTriggerStaleDays();
  const maxTriggers = Math.min(Number(process.env.DEAL_TRIGGER_LIMIT ?? "40"), 80);

  const { data: rows, error } = await admin
    .from("leads")
    .select("id, name, phone, status, last_contact, agency_id")
    .in("status", [...OPEN_DEAL_STATUSES])
    .order("updated_at", { ascending: true })
    .limit(maxTriggers * 4);

  if (error) throw new Error(error.message);

  const stale = (rows ?? [])
    .filter((r) => isLastContactStale(r.last_contact, staleDays))
    .slice(0, maxTriggers);

  const now = new Date().toISOString();

  for (const lead of stale) {
    const daysLabel = !lead.last_contact?.trim()
      ? "Nikdy nekontaktovaný"
      : `Posledný kontakt: ${lead.last_contact}`;

    await admin.from("activities").insert({
      lead_id: lead.id,
      type: "Deal trigger",
      title: "Stagnujúca príležitosť",
      text: `${lead.name ?? "Lead"} potrebuje follow-up. ${daysLabel}.`,
      entity_type: "lead",
      entity_id: lead.id,
      actor_name: "Strážca Cien a Ziskov",
      source: "deal_trigger_agent",
      severity: "warning",
      meta: { stale_days: staleDays, phone: lead.phone ?? null },
      created_at: now,
    });
  }

  return {
    ok: true,
    triggered: stale.length,
    staleDays,
    evaluated: rows?.length ?? 0,
  };
}
