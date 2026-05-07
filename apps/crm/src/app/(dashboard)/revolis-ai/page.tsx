import RevolisAIClient from "./RevolisAIClient";
import { buildMarketHotspots } from "@/lib/analytics/market-density";
import { buildDemandMoatPayload } from "@/lib/analytics/demand-moat";
import { getAiActivityFeedSeed } from "@/lib/mock-data";
import { getCurrentProfile } from "@/lib/auth";

export default async function RevolisAIPage() {
  const [hotspots, demandMoat, profile] = await Promise.all([
    buildMarketHotspots(),
    buildDemandMoatPayload(),
    getCurrentProfile(),
  ]);
  const feedSeed = getAiActivityFeedSeed();
  const raw = profile as { account_tier?: string | null; ui_role?: string | null; role?: string | null } | null;
  // ui_role is the authoritative access gate — set by billing webhook, not localStorage
  const uiRole     = raw?.ui_role ?? "agent";
  const accountTier =
    uiRole === "owner_protocol" || raw?.role === "founder"
      ? "protocol_authority"
      : (raw?.account_tier ?? "free");

  return (
    <RevolisAIClient
      hotspots={hotspots}
      feedSeed={feedSeed}
      demandData={demandMoat.demandData}
      supplyData={demandMoat.supplyData}
      detectedGap={demandMoat.detectedGap}
      accountTier={accountTier}
    />
  );
}
