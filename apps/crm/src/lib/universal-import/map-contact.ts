import type { ColumnMapping, MappedContact, SkipReason } from "@/lib/universal-import/types";

export function mapContactFromRow(
  raw: Record<string, string>,
  mapping: ColumnMapping,
): Partial<MappedContact> {
  const nameParts: string[] = [];
  const result: Partial<MappedContact> = {};

  for (const [header, target] of Object.entries(mapping)) {
    if (target === "skip") continue;
    const value = (raw[header] ?? "").trim();
    if (!value) continue;

    switch (target) {
      case "contact_name":
        nameParts.push(value);
        break;
      case "budget": {
        const digits = value.replace(/[^\d.,]/g, "").replace(",", ".");
        const num = Number.parseFloat(digits);
        if (!Number.isNaN(num)) result.budget = num;
        break;
      }
      case "phone":
        result.phone = value;
        break;
      case "email":
        result.email = value.toLowerCase();
        break;
      case "address":
        result.address = value;
        break;
      case "note":
        result.note = result.note ? `${result.note}; ${value}` : value;
        break;
      case "status":
        result.status = value;
        break;
      case "source":
        result.source = value;
        break;
      case "assigned_agent":
        result.assigned_agent = value;
        break;
      case "property_type":
        result.property_type = value;
        break;
      case "property_area":
        result.property_area = value;
        break;
      default:
        break;
    }
  }

  if (nameParts.length > 0) {
    result.contact_name = nameParts.join(" ");
  }

  return result;
}

export function validateMappedContact(mapped: Partial<MappedContact>): SkipReason | null {
  if (!mapped.contact_name?.trim()) return "missing_name";
  if (!mapped.phone?.trim() && !mapped.email?.trim()) return "missing_contact";
  return null;
}

export function mappedContactToLeadInsert(
  mapped: MappedContact,
  agencyId: string,
  defaultSource: string,
): Record<string, unknown> {
  const noteParts = [mapped.note, mapped.property_area ? `Plocha: ${mapped.property_area}` : ""]
    .filter(Boolean)
    .join("; ");

  return {
    id: crypto.randomUUID(),
    agency_id: agencyId,
    name: mapped.contact_name,
    email: mapped.email ?? "",
    phone: mapped.phone ?? "",
    location: mapped.address ?? "",
    budget: mapped.budget != null ? String(mapped.budget) : "",
    source: mapped.source?.trim() || defaultSource,
    note: noteParts,
    status: mapped.status?.trim() || "Nový",
    score: 50,
    assigned_agent: mapped.assigned_agent?.trim() || "Nepriradený",
    last_contact: "Práve importovaný",
    property_type: mapped.property_type?.trim() || "Byt",
    rooms: "",
    financing: "",
    timeline: "",
  };
}
