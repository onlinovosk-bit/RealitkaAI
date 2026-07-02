#!/usr/bin/env npx tsx
/**
 * Krok 1: FinStat CSV → enriched.json (+ per-domain HTML cache)
 * Usage: npx tsx scripts/prospecting/enrich.ts [--force]
 */
import fs from "node:fs";
import path from "node:path";
import { TEAM_PAGE_HINTS } from "./lib/config.ts";
import {
  discoverSubpageUrls,
  mergeEnrichmentFromPages,
} from "./lib/enrich-parser.ts";
import { isDeniedFetchUrl } from "./lib/denylist.ts";
import { fetchPage } from "./lib/fetcher.ts";
import { loadFinStatCsv } from "./lib/finstat.ts";
import { CACHE_DIR, ENRICHED_JSON, FINSTAT_CSV } from "./lib/paths.ts";
import type { EnrichedRecord, EnrichSkipReason } from "./lib/types.ts";

const force = process.argv.includes("--force");

function tryDomain(web: string): string | null {
  try {
    return new URL(web).hostname;
  } catch {
    return null;
  }
}

async function enrichOne(row: { ico: string; web: string; konatel: string }): Promise<EnrichedRecord> {
  const base = {
    ico: row.ico,
    enriched_at: new Date().toISOString(),
  };

  if (!row.web?.trim()) {
    return {
      ...base,
      domain: null,
      status: "skipped",
      skip_reason: "no_web",
      team_size_estimate: null,
      portals_detected: [],
      crm_signals: [],
      has_modern_web: false,
      konatel_on_web_as_broker: false,
      pages_fetched: [],
    };
  }

  if (isDeniedFetchUrl(row.web)) {
    return {
      ...base,
      domain: tryDomain(row.web),
      status: "skipped",
      skip_reason: "denied_domain",
      skip_detail: row.web,
      team_size_estimate: null,
      portals_detected: [],
      crm_signals: [],
      has_modern_web: false,
      konatel_on_web_as_broker: false,
      pages_fetched: [],
    };
  }

  const root = await fetchPage(row.web, { useCache: !force });
  if (!root.ok) {
    const reason: EnrichSkipReason =
      root.reason === "denied"
        ? "denied_domain"
        : root.reason === "robots"
          ? "robots_disallowed"
          : root.reason === "timeout"
            ? "timeout"
            : "fetch_failed";
    return {
      ...base,
      domain: tryDomain(row.web),
      status: "skipped",
      skip_reason: reason,
      skip_detail: root.detail,
      team_size_estimate: null,
      portals_detected: [],
      crm_signals: [],
      has_modern_web: false,
      konatel_on_web_as_broker: false,
      pages_fetched: [],
    };
  }

  const pages: { url: string; html: string }[] = [{ url: root.url, html: root.html }];
  const subUrls = discoverSubpageUrls(row.web, root.html, TEAM_PAGE_HINTS);

  for (const sub of subUrls) {
    if (pages.length >= 6) break;
    if (isDeniedFetchUrl(sub)) continue;
    const subRes = await fetchPage(sub, { useCache: !force });
    if (subRes.ok) pages.push({ url: subRes.url, html: subRes.html });
  }

  const merged = mergeEnrichmentFromPages(pages, row.konatel);

  return {
    ...base,
    domain: tryDomain(row.web),
    status: "ok",
    ...merged,
    pages_fetched: pages.map((p) => p.url),
  };
}

async function main(): Promise<number> {
  if (!fs.existsSync(FINSTAT_CSV)) {
    console.error(`Missing ${FINSTAT_CSV} — place FinStat export there.`);
    return 1;
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const rows = loadFinStatCsv(FINSTAT_CSV);
  console.log(`[enrich] ${rows.length} rows from FinStat`);

  let existing: EnrichedRecord[] = [];
  if (!force && fs.existsSync(ENRICHED_JSON)) {
    existing = JSON.parse(fs.readFileSync(ENRICHED_JSON, "utf8")) as EnrichedRecord[];
  }
  const byIco = new Map(existing.map((e) => [e.ico, e]));

  let ok = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!force && byIco.has(row.ico) && byIco.get(row.ico)?.status === "ok") {
      continue;
    }
    const rec = await enrichOne(row);
    byIco.set(row.ico, rec);
    if (rec.status === "ok") ok++;
    else skipped++;
    process.stdout.write(`  ${row.ico} ${rec.status}${rec.skip_reason ? ` (${rec.skip_reason})` : ""}\n`);
  }

  const out = [...byIco.values()].sort((a, b) => a.ico.localeCompare(b.ico));
  fs.mkdirSync(path.dirname(ENRICHED_JSON), { recursive: true });
  fs.writeFileSync(ENRICHED_JSON, JSON.stringify(out, null, 2), "utf8");
  console.log(`[enrich] done: ok=${ok} skipped=${skipped} → ${ENRICHED_JSON}`);
  return 0;
}

main().then((code) => process.exit(code));
