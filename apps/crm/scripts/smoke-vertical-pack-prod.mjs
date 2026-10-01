import dotenv from "dotenv";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);
const SOURCE_ID = "13303557";
const AGENCY = "11111111-1111-1111-1111-111111111111";

const { loadRealviaPropertyForDemo } = await import(
  pathToFileURL(path.resolve(__dirname, "../src/lib/capabilities/vertical-pack-demo/load-property.ts")).href
);
const { buildVerticalPackDemo } = await import(
  pathToFileURL(path.resolve(__dirname, "../src/lib/capabilities/vertical-pack-demo/build.ts")).href
);

const { data: row } = await supabase
  .from("properties")
  .select("usable_area, building_area, land_area, price, description, title")
  .eq("source_id", SOURCE_ID)
  .eq("source_system", "realvia")
  .maybeSingle();

const loaded = await loadRealviaPropertyForDemo(supabase, SOURCE_ID);
const demo = buildVerticalPackDemo({ agencyId: AGENCY, property: loaded.property });

const flags = [];
const passes = [];

function badge(name, ok) {
  (ok ? passes : flags).push(name);
}

badge("completeness", demo.completeness.guardian.verdict === "pass");
badge("listing", demo.listing.guardian.verdict === "pass");
badge("deckOwner", demo.deckOwner.guardianPass);
badge("deckBuyer", demo.deckBuyer.guardianPass);
badge("microsite", demo.microsite.guardianPass);
badge("banners", demo.banners.every((b) => b.guardianPass));

console.log(JSON.stringify({
  sourceId: demo.sourceId,
  fromFixture: loaded.fromFixture,
  scorePercent: demo.completeness.scorePercent,
  passCount: passes.length,
  flagCount: flags.length,
  passes,
  flags,
  listingGuardianReasons: demo.listing.guardian.reasons,
  descriptionHasHtml: /<[^>]+>/.test(String(loaded.property.description ?? "")),
  descriptionPreview: String(loaded.property.description ?? "").slice(0, 120),
  price: loaded.property.price,
  usableArea: loaded.property.usable_area,
  buildingArea: loaded.property.building_area,
  landArea: loaded.property.land_area,
  dbRow: row ?? null,
  areaMentionsInDesc: [...String(loaded.property.description ?? "").matchAll(/(\d+(?:[.,]\d+)?)\s*m²/gi)].map((m) => m[0]),
}, null, 2));
