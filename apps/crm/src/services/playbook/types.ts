import type { PlaybookItemType } from "@/ui/playbook/components.map";

// ─── BRI Engine ───────────────────────────────────────────────

export type BriSegment = "HOT_NOW" | "HIGH_PRIORITY" | "NURTURE" | "LOW_INTENT";

export interface BuyerReadinessDto {
  buyerId: string;
  buyerName: string;
  totalScore: number;      // 0–100 celkové skóre
  intentScore: number;     // 0–40 záujem (aktivity, počet obhliadok)
  fitScore: number;        // 0–30 zhoda profilu (budget, typ nehnuteľnosti)
  timingScore: number;     // 0–30 časovanie (čas od posledného kontaktu, urgencia)
  segment: BriSegment;
  reasons: string[];       // ľudsky čitateľné dôvody
}

// ─── Playbook DTO ─────────────────────────────────────────────

export interface PlaybookItemDto {
  id: string;
  type: PlaybookItemType;
  leadId: string;          // ID leadu v Supabase (= buyerId v BRI engine)
  buyerId?: string;        // alias pre kompatibilitu s promptom
  propertyId?: string;
  buyerName?: string;
  buyerScore?: number;
  propertyTitle?: string;
  title: string;
  subtitle: string;
  reason: string;
  badges?: string[];
  ctaLabel: string;
  priority: number;        // 0–100, pre zoradenie
}

/** Hlavná odpoveď API */
export interface PlaybookResponse {
  scope: "today" | "week";
  items: PlaybookItemDto[];
  generatedAt: string;
}

/** Alias pre spätná kompatibilita s existujúcim kódom */
export type PlaybookApiResponse = PlaybookResponse;
