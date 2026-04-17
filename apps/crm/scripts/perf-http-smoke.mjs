/**
 * Rýchla kontrola HTTP latencie (TTFB + celkový čas) pre kľúčové URL.
 * Použitie: spustiť dev alebo prod server, potom:
 *   node scripts/perf-http-smoke.mjs
 *   PERF_BASE_URL=https://example.com node scripts/perf-http-smoke.mjs
 */
import http from "node:http";
import https from "node:https";
import { performance } from "node:perf_hooks";

const BASE = process.env.PERF_BASE_URL || "http://127.0.0.1:3000";
const PATHS = ["/landing", "/login"];

function requestOnce(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const t0 = performance.now();
    const req = lib.get(url, (res) => {
      res.resume();
      res.on("end", () => {
        resolve({
          url,
          status: res.statusCode ?? 0,
          ms: Math.round(performance.now() - t0),
        });
      });
    });
    req.on("error", reject);
    req.setTimeout(30_000, () => {
      req.destroy(new Error("timeout"));
    });
  });
}

async function main() {
  console.log(`PERF_BASE_URL=${BASE}\n`);
  const rows = [];
  for (const p of PATHS) {
    const url = new URL(p, BASE).href;
    try {
      const r = await requestOnce(url);
      rows.push(r);
      console.log(`${r.status}\t${r.ms}ms\t${url}`);
    } catch (e) {
      console.log(`ERR\t-\t${url}\t${e instanceof Error ? e.message : e}`);
      process.exitCode = 1;
    }
  }
  const avg = rows.length
    ? Math.round(rows.reduce((a, r) => a + r.ms, 0) / rows.length)
    : 0;
  console.log(`\nPriemer (ms): ${avg}`);
}

main();
