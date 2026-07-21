/** Map location text → NBS region code in regional-prices.json */
const CITY_TO_REGION: Record<string, string> = {
  bratislava: "BA",
  košice: "KE",
  kosice: "KE",
  prešov: "PO",
  presov: "PO",
  poprad: "PO",
  humenne: "PO",
  humenné: "PO",
  michalovce: "KE",
  trebišov: "KE",
  trebisov: "KE",
  bardejov: "PO",
  snina: "PO",
  trnava: "TT",
  nitra: "NR",
  žilina: "ZA",
  zilina: "ZA",
  trenčín: "TN",
  trencin: "TN",
  banská: "BB",
  banska: "BB",
  zvolen: "BB",
};

const REGION_LABELS: Record<string, string> = {
  SK: "Slovensko",
  BA: "Bratislavský kraj",
  KE: "Košický kraj",
  PO: "Prešovský kraj",
  TT: "Trnavský kraj",
  NR: "Nitriansky kraj",
  TN: "Trenčiansky kraj",
  ZA: "Žilinský kraj",
  BB: "Banskobystrický kraj",
};

export function resolveRegionFromLocation(location: string): {
  regionCode: string;
  regionLabel: string;
} {
  const lower = location.toLowerCase();
  for (const [city, code] of Object.entries(CITY_TO_REGION)) {
    if (lower.includes(city)) {
      return { regionCode: code, regionLabel: REGION_LABELS[code] ?? code };
    }
  }
  return { regionCode: "SK", regionLabel: REGION_LABELS.SK };
}
