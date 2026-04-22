import { NextResponse } from "next/server";

// SK realitný trh – realistické ceny podľa lokality
const SK_PRICE_MAP: Record<string, { base: number; growth: number }> = {
  bratislava: { base: 3800, growth: 0.08 },
  kosice:     { base: 2100, growth: 0.05 },
  presov:     { base: 1650, growth: 0.03 },
  prešov:     { base: 1650, growth: 0.03 },
  nitra:      { base: 1800, growth: 0.04 },
  zilina:     { base: 1900, growth: 0.04 },
  žilina:     { base: 1900, growth: 0.04 },
  banska:     { base: 1700, growth: 0.03 },
  banská:     { base: 1700, growth: 0.03 },
  trnava:     { base: 2200, growth: 0.05 },
  trenčín:    { base: 1750, growth: 0.03 },
  trencin:    { base: 1750, growth: 0.03 },
  default:    { base: 1600, growth: 0.02 },
};

function getLocationData(address: string) {
  const lower = address.toLowerCase();
  for (const [city, data] of Object.entries(SK_PRICE_MAP)) {
    if (lower.includes(city)) return data;
  }
  return SK_PRICE_MAP.default;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { address?: string; sqm?: number };

    if (!body.address || body.address.trim().length < 5) {
      return NextResponse.json(
        { error: "Adresa musí mať aspoň 5 znakov." },
        { status: 400 }
      );
    }

    const sqm = Math.max(30, Math.min(500, body.sqm ?? 75));
    const locationData = getLocationData(body.address);

    // Deterministický "random" pre konzistentné demo výsledky
    const seed = body.address.length + sqm;
    const variance = ((seed % 10) - 5) * 0.02; // ±10%
    const pricePerSqm = Math.round(locationData.base * (1 + variance));
    const estimatedPrice = pricePerSqm * sqm;

    const confidence =
      estimatedPrice > 200_000 ? 'high' :
      estimatedPrice > 100_000 ? 'medium' : 'low';

    const trend =
      locationData.growth > 0.06 ? 'rising' :
      locationData.growth > 0.03 ? 'stable' : 'falling';

    return NextResponse.json({
      address: body.address,
      estimatedPrice,
      pricePerSqm,
      confidence,
      trend,
      comparables: 12 + (seed % 8),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[demo/estimate] Error:", err);
    return NextResponse.json(
      { error: "Nepodarilo sa vypočítať odhad." },
      { status: 500 }
    );
  }
}
