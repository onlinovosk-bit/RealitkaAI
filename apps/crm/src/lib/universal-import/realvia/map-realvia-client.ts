import { createHash } from "crypto";
import type {
  RealviaAddress,
  RealviaClient,
  RealviaInspection,
  RealviaNote,
  RealviaOwner,
} from "./realvia-schema";

export const REALVIA_JSON_SOURCE = "Universal Import — Realvia JSON";

export type RevolisActivityDraft = {
  type: string;
  title: string;
  text: string;
  source: string;
  meta: Record<string, unknown>;
};

export type RevolisLeadDraft = {
  id: string;
  externalKey: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  source: string;
  status: string;
  note: string;
  property_type: string;
  do_not_contact: boolean;
  realvia_type: string | null;
  archived: boolean;
  meta: Record<string, unknown>;
};

export type MappedRealviaClient = {
  clientIndex: number;
  externalKey: string;
  lead: RevolisLeadDraft;
  activities: RevolisActivityDraft[];
  warnings: string[];
  skipReason?: string;
};

function formatAddress(addr?: RealviaAddress | null): string {
  if (!addr) return "";
  const parts = [addr.street, addr.number, addr.zip, addr.city].filter(Boolean);
  return parts.join(", ");
}

function noteText(note: RealviaNote): string {
  return (note.text ?? "").trim();
}

function inspectionText(inspection: RealviaInspection): string {
  const parts = [
    inspection.propertyAddress ?? inspection.address,
    inspection.note ?? inspection.text,
    inspection.status ? `Stav: ${inspection.status}` : null,
    inspection.date ?? inspection.created,
  ].filter(Boolean);
  return parts.join(" — ");
}

export function realviaClientExternalKey(owner: RealviaOwner, clientId?: string | number | null): string {
  const email = (owner.email ?? "").toLowerCase();
  const phone = (owner.phone ?? "").replace(/\D/g, "");
  const name = (owner.name ?? "").toLowerCase();
  const idPart = clientId != null ? String(clientId) : "";
  const raw = [idPart, name, email, phone, owner.type ?? ""].join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export function makeRealviaLeadId(agencyId: string, externalKey: string): string {
  const hash = createHash("sha1").update(`${agencyId}:${externalKey}`).digest("hex").slice(0, 16);
  return `imp_realvia_${hash}`;
}

function mapOwnerStatus(owner: RealviaOwner): string {
  if (owner.type === "blacklist") return "Neoslovovať";
  if (owner.archived === 1) return "Archivovaný";
  if (owner.status === "finished") return "Ukončený";
  if (owner.type === "zaujemca") return "Záujemca";
  if (owner.type === "vlastnik") return "Vlastník";
  return "Nový";
}

function mapInterestsNote(owner: RealviaOwner): string {
  if (!owner.interests?.length) return "";
  return owner.interests
    .map((i) => {
      const type = i.type != null ? `type=${i.type}` : "";
      const category = i.category != null ? `category=${i.category}` : "";
      return [type, category].filter(Boolean).join(", ");
    })
    .filter(Boolean)
    .join("; ");
}

export function mapRealviaClientToRevolis(
  client: RealviaClient,
  agencyId: string,
  clientIndex = 0,
): MappedRealviaClient {
  const owner = client.owner;
  const warnings: string[] = [];
  const externalKey = realviaClientExternalKey(owner, client.id);
  const name = (owner.name ?? "").trim();
  const email = (owner.email ?? "").trim().toLowerCase();
  const phone = (owner.phone ?? "").trim();
  const doNotContact = owner.type === "blacklist";

  if (!name) {
    return {
      clientIndex,
      externalKey,
      lead: buildEmptyLead(agencyId, externalKey, doNotContact),
      activities: [],
      warnings,
      skipReason: "missing_name",
    };
  }

  if (!email && !phone) {
    return {
      clientIndex,
      externalKey,
      lead: buildEmptyLead(agencyId, externalKey, doNotContact),
      activities: [],
      warnings,
      skipReason: "missing_contact",
    };
  }

  const location = formatAddress(owner.postalAddress) || formatAddress(owner.invoiceAddress);
  const interestNote = mapInterestsNote(owner);
  const noteParts = [
    interestNote ? `Záujem: ${interestNote}` : "",
    owner.archived === 1 ? "Realvia: archivovaný" : "",
    doNotContact ? "[DO-NOT-CONTACT] Realvia blacklist" : "",
  ].filter(Boolean);

  const lead: RevolisLeadDraft = {
    id: makeRealviaLeadId(agencyId, externalKey),
    externalKey,
    name,
    email,
    phone,
    location,
    source: REALVIA_JSON_SOURCE,
    status: mapOwnerStatus(owner),
    note: noteParts.join("; "),
    property_type: owner.type === "vlastnik" ? "Predaj" : "Byt",
    do_not_contact: doNotContact,
    realvia_type: owner.type,
    archived: owner.archived === 1,
    meta: {
      realvia_created: owner.created,
      realvia_updated: owner.updated,
      realvia_status: owner.status,
      invoice_company: owner.invoiceAddress?.companyName ?? null,
    },
  };

  const activities: RevolisActivityDraft[] = [];

  for (const note of owner.notes ?? []) {
    const text = noteText(note);
    if (!text) continue;
    activities.push({
      type: "Poznámka",
      title: "Poznámka",
      text,
      source: "realvia-json",
      meta: {
        realvia_created: note.created,
        realvia_updated: note.updated,
      },
    });
  }

  for (const inspection of owner.inspections ?? []) {
    const text = inspectionText(inspection);
    if (!text) {
      warnings.push("Obhliadka bez textu — preskočená");
      continue;
    }
    activities.push({
      type: "Obhliadka",
      title: "Obhliadka",
      text,
      source: "realvia-json",
      meta: {
        realvia_date: inspection.date ?? inspection.created,
        realvia_status: inspection.status,
      },
    });
  }

  // TODO(realvia-property-match): fuzzy match inspections/properties by address — no auto-link yet.

  return { clientIndex, externalKey, lead, activities, warnings };
}

function buildEmptyLead(
  agencyId: string,
  externalKey: string,
  doNotContact: boolean,
): RevolisLeadDraft {
  return {
    id: makeRealviaLeadId(agencyId, externalKey),
    externalKey,
    name: "",
    email: "",
    phone: "",
    location: "",
    source: REALVIA_JSON_SOURCE,
    status: doNotContact ? "Neoslovovať" : "Nový",
    note: "",
    property_type: "Byt",
    do_not_contact: doNotContact,
    realvia_type: null,
    archived: false,
    meta: {},
  };
}
