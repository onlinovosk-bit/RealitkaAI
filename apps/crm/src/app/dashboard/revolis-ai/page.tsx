import RevolisAIClient from "./RevolisAIClient";
import { buildMarketHotspots } from "@/lib/analytics/market-density";
import { getAiActivityFeedSeed } from "@/lib/mock-data";

export default async function RevolisAIPage() {
  const hotspots = await buildMarketHotspots();
  const feedSeed = getAiActivityFeedSeed();

  return <RevolisAIClient hotspots={hotspots} feedSeed={feedSeed} />;
}
