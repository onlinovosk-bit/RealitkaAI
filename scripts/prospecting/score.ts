#!/usr/bin/env npx tsx
/**
 * Krok 2: enriched.json + FinStat → scored.json
 * Usage: npx tsx scripts/prospecting/score.ts
 */
import fs from "node:fs";
import path from "node:path";
import { buildScoredProspect } from "./lib/scoring.ts";
import { loadFinStatCsv } from "./lib/finstat.ts";
import {
  ENRICHED_JSON,
  FINSTAT_CSV,
  SCORED_JSON,
} from "./lib/paths.ts";
import type { EnrichedRecord } from "./lib/types.ts";

function main(): number {
  if (!fs.existsSync(FINSTAT_CSV)) {
    console.error(`Missing ${FINSTAT_CSV}`);
    return 1;
  }

  const rows = loadFinStatCsv(FINSTAT_CSV);
  let enriched: EnrichedRecord[] = [];
  if (fs.existsSync(ENRICHED_JSON)) {
    enriched = JSON.parse(fs.readFileSync(ENRICHED_JSON, "utf8")) as EnrichedRecord[];
  }

  const byIco = new Map(enriched.map((e) => [e.ico, e]));
  const scored = rows.map((row) => buildScoredProspect(row, byIco.get(row.ico) ?? null));
  scored.sort((a, b) => b.icp_score - a.icp_score);

  fs.mkdirSync(path.dirname(SCORED_JSON), { recursive: true });
  fs.writeFileSync(SCORED_JSON, JSON.stringify(scored, null, 2), "utf8");

  const qualified = scored.filter((s) => !s.disqualified);
  console.log(`[score] ${scored.length} prospects, ${qualified.length} qualified`);
  console.log(`[score] top score: ${scored[0]?.icp_score ?? 0} → ${SCORED_JSON}`);
  return 0;
}

process.exit(main());
