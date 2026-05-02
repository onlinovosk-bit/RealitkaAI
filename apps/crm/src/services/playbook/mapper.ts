// src/services/playbook/mapper.ts

import type { PlaybookItemDto } from "@/services/playbook/types";
import type {
  LeadSnapshot,
  PlaybookAction,
  PlaybookActionType,
} from "@/domain/playbook/types";

/**
 * Mapuje domain PlaybookAction + LeadSnapshot na UI DTO.
 */
export function mapActionToDto(
  action: PlaybookAction,
  lead: LeadSnapshot
): PlaybookItemDto {
  const type = action.type;
  const title = buildTitle(type, action.buyerName ?? "Klient");
  const subtitle = buildSubtitle(lead);
  const badges = buildBadges(action.segment, action.buyerScore, action.status ?? "");
  const ctaLabel = buildCta(type);

  return {
    id: `pb-${lead.id}`,
    leadId: lead.id,
    buyerId: lead.id,
    type,
    buyerName: action.buyerName ?? lead.name ?? "",
    buyerScore: action.buyerScore,
    propertyTitle: lead.propertyType
      ? `${lead.propertyType}${lead.rooms ? `, ${lead.rooms}` : ""}`
      : undefined,
    title,
    subtitle,
    reason: action.mainReason,
    badges,
    ctaLabel,
    priority: action.buyerScore,
  };
}

// ─── Helpers (presunuté z pôvodného súboru) ─────────────────

function buildTitle(type: PlaybookActionType, name: string): string {
  switch (type) {
    case "CALL":
      return `Zavolaj ${name}`;
    case "MESSAGE":
      return `Pošli správu – ${name}`;
    case "RISK":
      return `Riziková príležitosť – ${name}`;
    case "OPPORTUNITY":
      return `Uzavri obchod – ${name}`;
  }
}

function buildSubtitle(lead: LeadSnapshot): string {
  return [lead.location, lead.propertyType, lead.rooms, lead.budget]
    .filter(Boolean)
    .join(" · ");
}

function buildBadges(
  segment: string,
  total: number,
  status: string
): string[] {
  const badges: string[] = [];
  if (segment === "HOT_NOW") badges.push("HOT NOW");
  if (segment === "HIGH_PRIORITY") badges.push("HIGH PRIORITY");
  if (status === "Ponuka") badges.push("Ponuka");
  if (status === "Obhliadka") badges.push("Obhliadka");
  if (total >= 90) badges.push("Top BRI");
  return badges;
}

function buildCta(type: PlaybookActionType): string {
  switch (type) {
    case "CALL":
      return "Zavolať";
    case "MESSAGE":
      return "Napísať";
    case "RISK":
      return "Reaktivovať";
    case "OPPORTUNITY":
      return "Uzavrieť";
  }
}
