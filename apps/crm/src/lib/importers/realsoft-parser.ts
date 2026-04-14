import { XMLParser } from "fast-xml-parser";
import type { PropertyInput } from "@/lib/properties-store";

/** Výstup parsera pred mapovaním do DB. */
export type ParsedRealsoftListing = {
  title: string;
  price: number;
  areaM2: number | null;
  location: string;
  description: string;
  imageUrls: string[];
};

const TITLE_KEYS = ["title", "nazov", "nadpis", "name", "subject", "predmet", "hlavicka"];
const PRICE_KEYS = ["price", "cena", "amount", "suma"];
const AREA_KEYS = ["area", "plocha", "vymera", "uzitkova_plocha", "floorarea", "m2", "rozloha"];
const LOCATION_KEYS = ["location", "lokalita", "mesto", "obec", "adresa", "region", "miesto"];
const DESC_KEYS = ["description", "popis", "text", "detail", "obsah", "poznamka"];

function unwrap(v: unknown): unknown {
  if (v == null) return v;
  if (Array.isArray(v)) return unwrap(v[0]);
  if (typeof v === "object" && v !== null && "#text" in (v as Record<string, unknown>)) {
    return (v as Record<string, unknown>)["#text"];
  }
  return v;
}

function toStr(v: unknown): string {
  const u = unwrap(v);
  if (u == null) return "";
  if (typeof u === "string") return u.trim();
  if (typeof u === "number" || typeof u === "boolean") return String(u);
  return "";
}

function normKey(k: string): string {
  return k.replace(/^@_?/, "").toLowerCase();
}

/** Hľadá prvú hodnotu pod kľúčom z candidátov (rekurzívne). */
export function deepFindFirstString(obj: unknown, keyCandidates: string[]): string {
  const set = new Set(keyCandidates.map((k) => k.toLowerCase()));
  if (obj == null) return "";
  if (typeof obj !== "object") return "";

  const rec = obj as Record<string, unknown>;
  for (const k of Object.keys(rec)) {
    if (set.has(normKey(k))) {
      const s = toStr(rec[k]);
      if (s) return s;
    }
  }
  for (const k of Object.keys(rec)) {
    const nested = deepFindFirstString(rec[k], keyCandidates);
    if (nested) return nested;
  }
  return "";
}

function parsePrice(raw: string): number {
  const cleaned = raw.replace(/\s/g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function parseArea(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, "").replace(/,/g, ".");
  const m = cleaned.match(/(\d+([.,]\d+)?)/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const IMG_ATTR_KEYS = ["url", "href", "src", "link", "odkaz"];

function collectImageUrls(obj: unknown, out: Set<string>, depth = 0): void {
  if (depth > 40 || obj == null) return;
  if (typeof obj === "string") {
    const s = obj.trim();
    if (/^https?:\/\//i.test(s)) out.add(s);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((x) => collectImageUrls(x, out, depth + 1));
    return;
  }
  if (typeof obj !== "object") return;

  const rec = obj as Record<string, unknown>;
  const tag = Object.keys(rec).map(normKey).join(" ");

  for (const k of Object.keys(rec)) {
    const nk = normKey(k);
    if (nk === "image" || nk === "images" || nk === "foto" || nk === "fotografie" || nk === "photo" || nk === "picture") {
      collectImageUrls(rec[k], out, depth + 1);
    }
  }

  for (const k of Object.keys(rec)) {
    const nk = normKey(k);
    if (IMG_ATTR_KEYS.some((a) => nk.includes(a) || nk === `@_${a}`)) {
      const s = toStr(rec[k]);
      if (/^https?:\/\//i.test(s)) out.add(s);
    }
  }

  for (const k of Object.keys(rec)) {
    collectImageUrls(rec[k], out, depth + 1);
  }
}

/**
 * Parsuje štandardný Realsoft / Nehnuteľnosti.sk export (XML reťazec).
 * Podporuje anglické aj slovenské názvy tagov a bežné vnorenia.
 */
export function parseRealsoftXml(xml: string): ParsedRealsoftListing {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    trimValues: true,
    parseTagValue: true,
    parseAttributeValue: true,
  });

  const doc = parser.parse(xml);
  const root = doc && typeof doc === "object" ? (Object.values(doc)[0] ?? doc) : doc;

  const title =
    deepFindFirstString(root, TITLE_KEYS) ||
    deepFindFirstString(doc, TITLE_KEYS) ||
    "Neznámy inzerát";

  const priceRaw = deepFindFirstString(root, PRICE_KEYS) || deepFindFirstString(doc, PRICE_KEYS) || "0";
  const price = parsePrice(priceRaw);

  const areaRaw = deepFindFirstString(root, AREA_KEYS) || deepFindFirstString(doc, AREA_KEYS);
  const areaM2 = areaRaw ? parseArea(areaRaw) : null;

  const location =
    deepFindFirstString(root, LOCATION_KEYS) || deepFindFirstString(doc, LOCATION_KEYS) || "";

  let description = deepFindFirstString(root, DESC_KEYS) || deepFindFirstString(doc, DESC_KEYS) || "";
  if (!description && typeof root === "object" && root !== null) {
    description = toStr((root as Record<string, unknown>)["popis"]);
  }

  const urls = new Set<string>();
  collectImageUrls(doc, urls);

  return {
    title: title.slice(0, 500),
    price,
    areaM2,
    location: location.slice(0, 300),
    description: description.slice(0, 20000),
    imageUrls: [...urls].slice(0, 40),
  };
}

/** Odhad typu a izieb z textu (hrubá heuristika). */
function inferRoomsAndType(parsed: ParsedRealsoftListing): { rooms: string; type: string } {
  const blob = `${parsed.title} ${parsed.description}`.toLowerCase();
  let rooms = "2 izby";
  const m = blob.match(/(\d)\s*[-]?\s*izb/);
  if (m) rooms = `${m[1]} izby`;
  let type: string = "Byt";
  if (/\bdom\b|rodinný|rodinny|vila/.test(blob)) type = "Dom";
  else if (/\bpozemok\b|záhrad|zahrada|parcela/.test(blob)) type = "Pozemok";
  else if (/kancel|obchod|priestor|hala|sklad/.test(blob)) type = "Komerčný priestor";
  return { rooms, type };
}

/**
 * Mapovanie na schému `properties` (PropertyInput).
 * Obrázky ukladáme ako položky vo `features` (`img:<url>`), aby boli viditeľné v UI a matchingu.
 */
export function mapRealsoftToPropertyInput(
  parsed: ParsedRealsoftListing,
  opts?: { agencyId?: string | null }
): PropertyInput {
  const { rooms, type } = inferRoomsAndType(parsed);
  const imageFeatures = parsed.imageUrls.map((u) => `img:${u}`);
  const metaFeatures = [
    ...(parsed.areaM2 != null ? [`plocha_m2:${parsed.areaM2}`] : []),
    ...imageFeatures,
  ];

  const desc =
    parsed.description +
    (parsed.imageUrls.length
      ? `\n\n[Fotografie z XML: ${parsed.imageUrls.length}]`
      : "");

  return {
    title: parsed.title,
    location: parsed.location || "Nešpecifikované",
    price: parsed.price > 0 ? parsed.price : 1,
    type,
    rooms,
    features: metaFeatures,
    status: "Aktívna",
    description: desc,
    ownerName: "",
    ownerPhone: "",
    agencyId: opts?.agencyId ?? null,
  };
}
