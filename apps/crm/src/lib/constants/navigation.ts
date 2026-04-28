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
      { id: "ai_assistant_workhours", name: "AI Asistent (pracovné hodiny)", minTier: "STARTER" },
      { id: "daily_briefing", name: "Denný AI briefing o 8:00", minTier: "STARTER" },
      { id: "hot_alert", name: "Hot Alert (skóre 75+)", minTier: "STARTER" },
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
      { id: "predictive_deal_scoring", name: "Predictive Deal Scoring", minTier: "MARKET_VISION" },
      { id: "intent_detection", name: "Intent Detection", minTier: "MARKET_VISION" },
      { id: "territory_intelligence", name: "Territory Intelligence", minTier: "MARKET_VISION" },
      { id: "revenue_forecasting", name: "Revenue Forecasting", minTier: "MARKET_VISION" },
      { id: "portal_integrations", name: "Portálové integrácie", minTier: "MARKET_VISION" },
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
      { id: "buyer_readiness_index", name: "Buyer Readiness Index", minTier: "STARTER" },
      { id: "weekly_conversion_report", name: "Týždenný konverzný report", minTier: "STARTER" },
      { id: "revolis_academy", name: "Revolis Academy", minTier: "STARTER" },
      { id: "ai_assistant_24_7", name: "AI Asistent 24/7", minTier: "MARKET_VISION" },
      { id: "ai_call_analysis", name: "AI hovorová analýza", minTier: "MARKET_VISION" },
      { id: "auto_recontact", name: "Automatické opätovné kontakty", minTier: "MARKET_VISION" },
      { id: "broker_profile", name: "Broker Reputation Profile", minTier: "STARTER" },
      { id: "owner_overview", name: "Prehľad majiteľa", minTier: "PROTOCOL_AUTHORITY" },
      { id: "team_ai_brain", name: "Team AI Brain", minTier: "PROTOCOL_AUTHORITY" },
      { id: "competitor_alert", name: "Competitor Alert", minTier: "PROTOCOL_AUTHORITY" },
      { id: "custom_ai_persona", name: "Vlastná AI Persona", minTier: "PROTOCOL_AUTHORITY" },
      { id: "api_access", name: "API Prístup", minTier: "PROTOCOL_AUTHORITY" },
      { id: "white_label", name: "White-label", minTier: "PROTOCOL_AUTHORITY" },
      { id: "dedicated_am", name: "Dedikovaný Account Manager", minTier: "PROTOCOL_AUTHORITY" },
      { id: "sla_uptime", name: "SLA garancia 99.9% uptime", minTier: "PROTOCOL_AUTHORITY" },
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
