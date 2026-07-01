// Dedikovaná inbound adresa -> agency. Rozšíri sa pri zákazníkovi #2.
const INBOUND_AGENCY_MAP: Record<string, string> = {
  "smolko@inbound.revolis.ai": "11111111-1111-1111-1111-111111111111",
};

export function agencyForInbound(toAddress: string): string | null {
  return INBOUND_AGENCY_MAP[toAddress.toLowerCase().trim()] ?? null;
}
