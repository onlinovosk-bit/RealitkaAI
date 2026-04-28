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
  const accountTier = (profile as { account_tier?: string | null } | null)?.account_tier ?? "free";

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
