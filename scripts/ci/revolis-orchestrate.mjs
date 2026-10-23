#!/usr/bin/env node
// revolis-orchestrate — Intake až PR readiness. Žiadny merge, deploy ani post-release.
//
//   node scripts/ci/revolis-orchestrate.mjs --fixture fixture.json [--root dir]
//
// Vstupný príkaz vždy zavolá probeStacks. JSON nemôže označiť chýbajúci zásobník ako PASS.
// Exit 0 len keď prReady. Exit 2: pokazený JSON. Exit 1: inak nie je ready, alebo zakázaná akcia.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { guardPipeline, probeStacks } from "./lib/orchestrate.mjs";

const fixtureAt = process.argv.indexOf("--fixture");
const file = fixtureAt === -1 ? "" : process.argv[fixtureAt + 1];
const rootAt = process.argv.indexOf("--root");
const root = rootAt === -1
  ? resolve(new URL("../..", import.meta.url).pathname)
  : resolve(process.argv[rootAt + 1] || "");

if (!file) {
  console.error("použitie: revolis-orchestrate.mjs --fixture <file.json> [--root dir]");
  process.exit(2);
}

let input;
try {
  input = JSON.parse(readFileSync(resolve(file), "utf8"));
} catch {
  console.log(JSON.stringify({
    prReady: false,
    code: "malformed_config",
    actions: [],
    performsMerge: false,
    performsDeploy: false,
    postReleaseRan: false,
  }, null, 2));
  process.exit(2);
}

if (!input || typeof input !== "object" || Array.isArray(input)) {
  console.log(JSON.stringify({
    prReady: false,
    code: "malformed_config",
    actions: [],
    performsMerge: false,
    performsDeploy: false,
    postReleaseRan: false,
  }, null, 2));
  process.exit(2);
}

const probes = await probeStacks(root);
const result = guardPipeline({
  stageResults: input.stageResults,
  checks: input.checks,
  probes,
});
console.log(JSON.stringify({ ...result, actions: result.actions }, null, 2));
if (result.performsMerge || result.performsDeploy || result.postReleaseRan) process.exit(1);
process.exit(result.prReady ? 0 : 1);
