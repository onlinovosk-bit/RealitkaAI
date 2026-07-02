#!/usr/bin/env npx tsx
/**
 * Krok 3: scored.json → CSV + markdown report
 * Usage: npx tsx scripts/prospecting/export.ts [--personalize N]
 */
import fs from "node:fs";
import path from "node:path";
import { generatePersonalLine } from "./lib/personalize.ts";
import { PROSPECTS_CSV, REPORT_MD, SCORED_JSON } from "./lib/paths.ts";
import type { ScoredProspect } from "./lib/types.ts";

function escapeCsv(v: string | number | boolean | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: ScoredProspect[]): string {
  const headers = [
    "ico",
    "nazov",
    "mesto",
    "kraj",
    "icp_score",
    "disqualified",
    "web",
    "outreach_email",
    "konatel",
    "telefon",
    "zamestnanci",
    "team_size_estimate",
    "portals_detected",
    "crm_signals",
    "personal_line",
    "needs_review",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.ico,
        r.nazov,
        r.mesto,
        r.kraj,
        r.icp_score,
        r.disqualified,
        r.web,
        r.outreach_email ?? "",
        r.konatel,
        r.telefon,
        r.zamestnanci ?? "",
        r.team_size_estimate ?? "",
        r.portals_detected.join("|"),
        r.crm_signals.join("|"),
        r.personal_line ?? "",
        r.needs_review ?? false,
      ]
        .map(escapeCsv)
        .join(","),
    );
  }
  return lines.join("\n");
}

function histogram(scores: number[]): string {
  const buckets = [0, 0, 0, 0, 0];
  for (const s of scores) {
    const i = Math.min(4, Math.floor(s / 20));
    buckets[i]++;
  }
  return buckets.map((n, i) => `| ${i * 20}–${i * 20 + 19} | ${n} |`).join("\n");
}

function buildReport(rows: ScoredProspect[]): string {
  const qualified = rows.filter((r) => !r.disqualified);
  const byKraj = new Map<string, number>();
  for (const r of qualified) {
    const k = r.kraj || "neznámy";
    byKraj.set(k, (byKraj.get(k) ?? 0) + 1);
  }

  const top50 = qualified.slice(0, 50);
  const krajeTable = [...byKraj.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `| ${k} | ${n} |`)
    .join("\n");

  const topTable = top50
    .map(
      (r, i) =>
        `| ${i + 1} | ${r.nazov} | ${r.mesto} | ${r.icp_score} | ${r.portals_detected.join(", ") || "—"} |`,
    )
    .join("\n");

  return `# Prospecting report

**Vygenerované:** ${new Date().toISOString()}

## Súhrn

| Metrika | Hodnota |
|---------|---------|
| Celkom | ${rows.length} |
| Kvalifikovaných | ${qualified.length} |
| Diskvalifikovaných | ${rows.length - qualified.length} |

## Po krajoch (kvalifikovaní)

| Kraj | Počet |
|------|-------|
${krajeTable || "| — | 0 |"}

## Histogram ICP skóre

| Rozsah | Počet |
|--------|-------|
${histogram(qualified.map((r) => r.icp_score))}

## Top 50

| # | Názov | Mesto | Skóre | Portály |
|---|-------|-------|-------|---------|
${topTable || "| — | — | — | — | — |"}
`;
}

async function main(): Promise<number> {
  if (!fs.existsSync(SCORED_JSON)) {
    console.error(`Run score first. Missing ${SCORED_JSON}`);
    return 1;
  }

  const all = JSON.parse(fs.readFileSync(SCORED_JSON, "utf8")) as ScoredProspect[];
  let rows = all.filter((r) => !r.disqualified).sort((a, b) => b.icp_score - a.icp_score);

  const personalizeArg = process.argv.find((a) => a.startsWith("--personalize"));
  const topN = personalizeArg
    ? parseInt(
        personalizeArg.includes("=")
          ? personalizeArg.split("=")[1]
          : (process.argv[process.argv.indexOf("--personalize") + 1] ?? "0"),
        10,
      )
    : 0;

  if (topN > 0) {
    console.log(`[export] personalizing top ${topN}…`);
    const topIcos = new Set(rows.slice(0, topN).map((r) => r.ico));
    for (const r of rows.slice(0, topN)) {
      try {
        r.personal_line = await generatePersonalLine(r);
        r.needs_review = true;
      } catch (e) {
        console.warn(`  skip personalize ${r.ico}:`, e instanceof Error ? e.message : e);
      }
    }
    const merged = all.map((r) => (topIcos.has(r.ico) ? rows.find((x) => x.ico === r.ico) ?? r : r));
    fs.writeFileSync(SCORED_JSON, JSON.stringify(merged, null, 2), "utf8");
  }

  fs.mkdirSync(path.dirname(PROSPECTS_CSV), { recursive: true });
  fs.writeFileSync(PROSPECTS_CSV, toCsv(rows), "utf8");
  fs.writeFileSync(REPORT_MD, buildReport(rows), "utf8");

  console.log(`[export] ${rows.length} rows → ${PROSPECTS_CSV}`);
  console.log(`[export] report → ${REPORT_MD}`);
  return 0;
}

main().then((c) => process.exit(c));
