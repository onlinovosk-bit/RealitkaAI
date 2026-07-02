import type { Lead } from "@/lib/leads-store";

type PropertyContactRow = {
  id: string;
  title?: string | null;
  location?: string | null;
  type?: string | null;
  rooms?: string | null;
  broker_name?: string | null;
  broker_email?: string | null;
  broker_phone?: string | null;
  owner_name?: string | null;
  owner_phone?: string | null;
  created_at?: string | null;
};

function normalizeKeyPart(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function toContactKey(row: PropertyContactRow): string {
  const email = normalizeKeyPart(row.broker_email);
  const phone = normalizeKeyPart(row.owner_phone ?? row.broker_phone);
  const name = normalizeKeyPart(row.owner_name ?? row.broker_name);
  return `${email}|${phone}|${name}`;
}

function displayName(row: PropertyContactRow): string {
  return row.owner_name?.trim() || row.broker_name?.trim() || "Kontakt z inzerátu";
}

function contactPhone(row: PropertyContactRow): string {
  return row.owner_phone?.trim() || row.broker_phone?.trim() || "";
}

function contactEmail(row: PropertyContactRow): string {
  return row.broker_email?.trim() || "";
}

function contactLocation(row: PropertyContactRow): string {
  return row.location?.trim() || "Neznáma lokalita";
}

function contactPropertyType(row: PropertyContactRow): string {
  return row.type?.trim() || "Nehnuteľnosť";
}

function contactRooms(row: PropertyContactRow): string {
  return row.rooms?.trim() || "Neuvedené";
}

function contactNote(row: PropertyContactRow): string {
  const source = row.owner_name?.trim() ? "Vlastník" : "Maklér";
  const title = row.title?.trim() || "Bez názvu";
  return `${source} z inzerátu: ${title}`;
}

export function buildFallbackContactsFromProperties(rows: PropertyContactRow[]): Lead[] {
  const byKey = new Map<string, PropertyContactRow>();

  for (const row of rows) {
    const hasName = Boolean((row.owner_name ?? row.broker_name ?? "").trim());
    const hasAnyContact = Boolean(
      (row.owner_phone ?? "").trim() ||
      (row.broker_phone ?? "").trim() ||
      (row.broker_email ?? "").trim(),
    );

    if (!hasName || !hasAnyContact) continue;

    const key = toContactKey(row);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      continue;
    }

    const currentCreated = Date.parse(row.created_at ?? "");
    const existingCreated = Date.parse(existing.created_at ?? "");
    if (!Number.isNaN(currentCreated) && (Number.isNaN(existingCreated) || currentCreated > existingCreated)) {
      byKey.set(key, row);
    }
  }

  return Array.from(byKey.values()).map((row, index) => ({
    id: `property-contact:${row.id}:${index}`,
    name: displayName(row),
    email: contactEmail(row),
    phone: contactPhone(row),
    location: contactLocation(row),
    budget: "",
    propertyType: contactPropertyType(row),
    rooms: contactRooms(row),
    financing: "",
    timeline: "",
    source: "Realvia nehnuteľnosti",
    status: "Nový",
    score: 50,
    assignedAgent: "Nepriradený",
    assignedProfileId: null,
    lastContact: "Bez kontaktu",
    note: contactNote(row),
    client_segment: null,
    buyer_readiness_score: null,
    ai_insight: null,
    sofia_insight: null,
    ai_engine: null,
    aiPriority: null,
    aiReason: null,
    aiTriageAt: null,
    aiPriorityManualAt: null,
    lastAiFollowupAt: null,
    aiFollowupCount: 0,
  }));
}
