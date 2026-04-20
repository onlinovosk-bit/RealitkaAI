import { listLeads } from "@/lib/leads-store";
import { listProperties } from "@/lib/properties-store";

export type MarketDemandSupplyRow = {
  location: string;
  leadCount: number;
  propertyCount: number;
  /** Záujemcovia na jednu ponuku v CRM (alebo „—“ / „∞“). */
  ratioLabel: string;
  /** Stručný stav trhu v zóne. */
  balanceLabel: string;
  /** Konkrétny ďalší krok pre makléra. */
  brokerAction: string;
};

export type MarketHotspotKind = "lead" | "property";

export type MarketHotspot = {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  kind: MarketHotspotKind;
  /** Voliteľný popis (napr. významová zóna na mape). */
  label?: string;
};

function normalizeLocationKey(raw: string): string {
  const t = raw.trim();
  return t.length > 0 ? t : "Neznáma lokalita";
}

function ratioAndInsight(leads: number, properties: number): Pick<
  MarketDemandSupplyRow,
  "ratioLabel" | "balanceLabel" | "brokerAction"
> {
  const gap = leads - properties;
  const p = properties;

  if (leads === 0 && p === 0) {
    return {
      ratioLabel: "—",
      balanceLabel: "Bez dát",
      brokerAction:
        "Doplň lokalitu pri príležitostiach a ponukách — bez toho nevieš porovnávať dopyt a inventár v CRM.",
    };
  }

  const ratioLabel =
    p === 0
      ? leads > 0
        ? "∞"
        : "—"
      : `${(leads / p).toLocaleString("sk-SK", {
          minimumFractionDigits: leads % p === 0 ? 0 : 1,
          maximumFractionDigits: 1,
        })}×`;

  if (p === 0 && leads > 0) {
    return {
      ratioLabel,
      balanceLabel: "Len dopyt v CRM",
      brokerAction:
        "V tejto zóne máš záujemcov, ale žiadnu ponuku v CRM — nájdi vhodné inzeráty alebo získaj výhradnú ponuku, aby šlo párovať.",
    };
  }

  if (leads === 0 && p > 0) {
    return {
      ratioLabel,
      balanceLabel: "Len ponuka v CRM",
      brokerAction:
        "Máš ponuky bez záujemcov v CRM — spusti cielený outreach, remarketing a import leadov z portálov do tejto lokality.",
    };
  }

  if (gap >= 6) {
    return {
      ratioLabel,
      balanceLabel: "Silný prebytok dopytu",
      brokerAction:
        "Záujem výrazne prevyšuje tvoje ponuky — priorita: nové listiny, výhradné zmluvy a rýchle párovanie; pri cene máš silnú vyjednávaciu pozíciu.",
    };
  }
  if (gap >= 3) {
    return {
      ratioLabel,
      balanceLabel: "Prebytok dopytu",
      brokerAction:
        "Viac záujemcov ako ponúk — aktívne oslov maklérov a vlastníkov pre nové inzeráty v tejto lokalite a sleduj zhody v Párovaní.",
    };
  }
  if (gap <= -6) {
    return {
      ratioLabel,
      balanceLabel: "Silný prebytok ponuky",
      brokerAction:
        "Ponúk je výrazne viac ako aktívnych záujemcov — zrýchli kvalifikáciu, otvorené dni a oslovovanie kupujúcich; skontroluj ceny a viditeľnosť inzerátov.",
    };
  }
  if (gap <= -3) {
    return {
      ratioLabel,
      balanceLabel: "Prebytok ponuky",
      brokerAction:
        "Viacej ponúk ako dopytu v CRM — posilni AI outreach, follow-up a databázu kupujúcich, aby sa ponuky neprestali točiť.",
    };
  }

  return {
    ratioLabel,
    balanceLabel: "Vyrovnané",
    brokerAction:
      "Dopyt a inventár sú v rovnováhe — udržiavaj pravidelný kontakt, obhliadky a aktualizuj skóre pripravenosti kúpy.",
  };
}

/**
 * Tabuľka dopyt vs. inventár podľa lokality — podklad pre rozhodnutia makléra.
 */
export async function buildMarketDemandSupplyTable(): Promise<MarketDemandSupplyRow[]> {
  const [leads, properties] = await Promise.all([listLeads(), listProperties()]);

  const agg = new Map<string, { leadCount: number; propertyCount: number }>();

  for (const lead of leads) {
    const key = normalizeLocationKey(lead.location ?? "");
    const cur = agg.get(key) ?? { leadCount: 0, propertyCount: 0 };
    cur.leadCount += 1;
    agg.set(key, cur);
  }
  for (const property of properties) {
    const key = normalizeLocationKey(property.location ?? "");
    const cur = agg.get(key) ?? { leadCount: 0, propertyCount: 0 };
    cur.propertyCount += 1;
    agg.set(key, cur);
  }

  const rows: MarketDemandSupplyRow[] = [];
  for (const [location, counts] of agg) {
    const r = ratioAndInsight(counts.leadCount, counts.propertyCount);
    rows.push({
      location,
      leadCount: counts.leadCount,
      propertyCount: counts.propertyCount,
      ...r,
    });
  }

  const unknownLast = (loc: string) => (loc.startsWith("Neznáma") ? 1 : 0);
  rows.sort((a, b) => {
    if (unknownLast(a.location) !== unknownLast(b.location)) {
      return unknownLast(a.location) - unknownLast(b.location);
    }
    const score = (x: MarketDemandSupplyRow) =>
      Math.abs(x.leadCount - x.propertyCount) * 3 +
      x.leadCount +
      x.propertyCount;
    return score(b) - score(a);
  });

  return rows.slice(0, 14);
}

export const DEMO_MARKET_TABLE_ROWS: MarketDemandSupplyRow[] = [
  {
    location: "Bratislava – Ružinov",
    leadCount: 14,
    propertyCount: 6,
    ratioLabel: "2,3×",
    balanceLabel: "Prebytok dopytu",
    brokerAction:
      "Viac záujemcov ako ponúk — získaj nové listiny v tejto zóne a využi Párovanie na rýchle spárovanie.",
  },
  {
    location: "Košice – centrum",
    leadCount: 5,
    propertyCount: 11,
    ratioLabel: "0,5×",
    balanceLabel: "Prebytok ponuky",
    brokerAction:
      "Viacej ponúk ako dopytu — posilni oslovenie kupujúcich a viditeľnosť; skontroluj, či sú leady správne tagované podľa lokality.",
  },
  {
    location: "Žilina",
    leadCount: 8,
    propertyCount: 8,
    ratioLabel: "1,0×",
    balanceLabel: "Vyrovnané",
    brokerAction:
      "Vyrovnaný trh — drž pravidelný kontakt, obhliadky a aktualizuj AI skóre u horúcich príležitostí.",
  },
];

function hashToPosition(seed: string): { x: number; y: number } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i);
  }
  const x = 8 + (Math.abs(h) % 84);
  const y = 8 + (Math.abs(h >> 9) % 84);
  return { x, y };
}

/**
 * Agreguje leady a nehnuteľnosti podľa lokality a vráti „horúce zóny“ v % súradniciach (0–100).
 */
export async function buildMarketHotspots(): Promise<MarketHotspot[]> {
  const [leads, properties] = await Promise.all([listLeads(), listProperties()]);

  const leadBuckets = new Map<string, number>();
  for (const lead of leads) {
    const key = lead.location.trim() || "Neznáma";
    leadBuckets.set(key, (leadBuckets.get(key) ?? 0) + 1);
  }

  const propertyBuckets = new Map<string, number>();
  for (const property of properties) {
    const key = property.location.trim() || "Neznáma";
    propertyBuckets.set(key, (propertyBuckets.get(key) ?? 0) + 1);
  }

  const spots: MarketHotspot[] = [];

  for (const [loc, count] of leadBuckets) {
    const { x, y } = hashToPosition(`lead:${loc}`);
    spots.push({
      x,
      y,
      radius: Math.min(32, 10 + count * 5),
      opacity: Math.min(0.55, 0.14 + count * 0.07),
      kind: "lead",
    });
  }

  for (const [loc, count] of propertyBuckets) {
    const { x, y } = hashToPosition(`prop:${loc}`);
    spots.push({
      x: ((x + 11) % 82) + 9,
      y: ((y + 13) % 82) + 9,
      radius: Math.min(26, 8 + count * 4),
      opacity: Math.min(0.42, 0.12 + count * 0.05),
      kind: "property",
    });
  }

  return spots;
}
