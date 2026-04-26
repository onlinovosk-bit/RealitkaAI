import RevolisAIClient from "./RevolisAIClient";
import { buildMarketHotspots } from "@/lib/analytics/market-density";
import { buildDemandMoatPayload } from "@/lib/analytics/demand-moat";
import { getAiActivityFeedSeed } from "@/lib/mock-data";

export default async function RevolisAIPage() {
  const [hotspots, demandMoat] = await Promise.all([
    buildMarketHotspots(),
    buildDemandMoatPayload(),
  ]);
  const feedSeed = getAiActivityFeedSeed();

  return (
    <RevolisAIClient
      hotspots={hotspots}
      feedSeed={feedSeed}
      demandData={demandMoat.demandData}
      supplyData={demandMoat.supplyData}
      detectedGap={demandMoat.detectedGap}
    />
  );
}
