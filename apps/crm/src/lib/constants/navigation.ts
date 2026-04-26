export type Tier = "STARTER" | "ACTIVE_FORCE" | "MARKET_VISION" | "PROTOCOL_AUTHORITY";

export type RevolisFeature = {
  id: string;
  name: string;
  minTier: Tier;
  isNew?: boolean;
};

export const REVOLIS_NAV_MATRIX: Record<
  "ZIVE_OBCHODY" | "TRHOVA_PREVAHA" | "HODNOTA_ZNACKY",
  {
    label: string;
    sub: string;
    features: RevolisFeature[];
  }
> = {
  ZIVE_OBCHODY: {
    label: "Živé Obchody",
    sub: "Okamžité príležitosti z trhu",
    features: [
      { id: "ambient_radar", name: "Ambient Deal Radar", minTier: "PROTOCOL_AUTHORITY", isNew: true },
      { id: "ghost_bsm", name: "Ghost 2.0 (BSM 2026)", minTier: "MARKET_VISION", isNew: true },
      { id: "kataster_pulse", name: "Kataster Pulse (Limit 100)", minTier: "MARKET_VISION" },
      { id: "kataster_pulse_unlimited", name: "Kataster Pulse UNLIMITED", minTier: "PROTOCOL_AUTHORITY" },
      { id: "xml_ingestor", name: "Zero-Click Ingestor", minTier: "ACTIVE_FORCE" },
      { id: "radar_digest", name: "Ambient Radar Digest", minTier: "MARKET_VISION" },
    ],
  },
  TRHOVA_PREVAHA: {
    label: "Trhová Prevaha",
    sub: "Dáta, ktoré konkurencia nemá",
    features: [
      { id: "neural_scoring", name: "Neural Lead Scoring", minTier: "MARKET_VISION" },
      { id: "heatmaps", name: "Hyper-local Heatmaps", minTier: "MARKET_VISION", isNew: true },
      { id: "sleep_detector", name: "Competitor Sleep Detector", minTier: "PROTOCOL_AUTHORITY", isNew: true },
      { id: "ai_pricing", name: "AI Cenotvorba", minTier: "MARKET_VISION" },
      { id: "shadow_inv", name: "Shadow Inventory", minTier: "PROTOCOL_AUTHORITY", isNew: true },
      { id: "market_gap", name: "Market Gap Report", minTier: "PROTOCOL_AUTHORITY" },
    ],
  },
  HODNOTA_ZNACKY: {
    label: "Hodnota Značky",
    sub: "Dôvera ako predajný nástroj",
    features: [
      { id: "broker_profile", name: "Broker Reputation Profile", minTier: "STARTER" },
      { id: "verified_cert", name: "Verified Certificate", minTier: "PROTOCOL_AUTHORITY", isNew: true },
      { id: "ai_coaching", name: "AI Coaching", minTier: "PROTOCOL_AUTHORITY", isNew: true },
      { id: "digital_onboarding", name: "Digital Onboarding", minTier: "ACTIVE_FORCE" },
      { id: "integrity_monitor", name: "Agent Integrity Monitor", minTier: "PROTOCOL_AUTHORITY" },
      { id: "performance", name: "Performance Analytics", minTier: "ACTIVE_FORCE" },
    ],
  },
};

export function normalizeTier(raw?: string | null): Tier {
  const key = (raw ?? "").toLowerCase().trim();
  if (key === "starter" || key === "free") return "STARTER";
  if (key === "pro" || key === "active_force") return "ACTIVE_FORCE";
  if (key === "market" || key === "market_vision") return "MARKET_VISION";
  if (key === "enterprise" || key === "protocol" || key === "protocol_authority") {
    return "PROTOCOL_AUTHORITY";
  }
  return "MARKET_VISION";
}
