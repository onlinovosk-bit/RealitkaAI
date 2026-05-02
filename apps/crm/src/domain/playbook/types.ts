// src/domain/playbook/types.ts

export interface LeadSnapshot {
  id: string;
  name: string | null;
  location: string | null;
  status: string | null;
  score: number | null;
  budget: string | null;
  propertyType: string | null;
  rooms: string | null;
  lastContactAt: string | null;
  createdAt: string | null;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: string;
  source?: string;
  severity?: string;
  createdAt: string;
}

export type PlaybookActionType = "CALL" | "MESSAGE" | "RISK" | "OPPORTUNITY";

export interface PlaybookAction {
  leadId: string;
  type: PlaybookActionType;
  buyerName: string | null;
  buyerScore: number;
  segment: string;
  status: string | null;
  mainReason: string;
  // prípadné ďalšie raw polia, ktoré potrebuješ na mapovanie do DTO
}
