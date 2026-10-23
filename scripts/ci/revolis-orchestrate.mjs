#!/usr/bin/env node
// revolis-orchestrate — Intake až PR readiness. Žiadny merge, deploy ani post-release.
//
//   node scripts/ci/revolis-orchestrate.mjs --fixture fixture.json
//
// Exit 0: prReady a žiadna zakázaná akcia. Exit 1: povinná kontrola alebo stage nie je PASS.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runPipeline } from "./lib/orchestrate.mjs";

const i = process.argv.indexOf("--fixture");
const file = i === -1 ? "" : process.argv[i + 1];
if (!file) {
  console.error("použitie: revolis-orchestrate.mjs --fixture <file.json>");
  process.exit(2);
}

const input = JSON.parse(readFileSync(resolve(file), "utf8"));
const result = runPipeline({
  stageResults: input.stageResults || {},
  checks: input.checks || null,
});
console.log(JSON.stringify({ ...result, actions: result.actions }, null, 2));
if (result.performsMerge || result.performsDeploy || result.postReleaseRan) process.exit(1);
process.exit(result.prReady ? 0 : 1);
