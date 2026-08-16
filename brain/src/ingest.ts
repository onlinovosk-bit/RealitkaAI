import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildDecisions, buildRegistry } from "./catalog.js";
import { loadBrain } from "./loader.js";
import { argString, normalizeNewlines, parseCliArgs, stableJson, writeIfChanged } from "./repo.js";

export const DECISIONS_SOT = "memory/decisions.md";
export const DECISIONS_TWIN = "brain/decisions/decisions.md";

export interface IngestResult {
  registryCount: number;
  decisionCount: number;
  changed: string[];
  valid: boolean;
  validationIssues: number;
}

function checkContent(path: string, expected: string): boolean {
  return existsSync(path) && normalizeNewlines(readFileSync(path, "utf8")) === expected;
}

/** Variant A (D-2026-08-17-01): ingest reads only memory/decisions.md. The brain MD twin is forbidden. */
export function assertDecisionsSourceOfTruth(repoRoot: string): void {
  const sot = resolve(repoRoot, DECISIONS_SOT);
  if (!existsSync(sot)) {
    throw new Error(`brain:ingest requires ${DECISIONS_SOT} as the only decisions source of truth`);
  }
  const twin = resolve(repoRoot, DECISIONS_TWIN);
  if (existsSync(twin)) {
    throw new Error(
      `${DECISIONS_TWIN} is a forbidden hand-maintained duplicate; SoT is ${DECISIONS_SOT} (D-2026-08-17-01 Variant A)`,
    );
  }
}

export function runIngest(options: {
  repoRoot: string;
  brainRoot: string;
  check?: boolean;
}): IngestResult {
  assertDecisionsSourceOfTruth(options.repoRoot);
  const registry = buildRegistry(options.repoRoot);
  const decisions = buildDecisions(options.repoRoot);
  const registryPath = resolve(options.brainRoot, "registry", "index.json");
  const decisionsPath = resolve(options.brainRoot, "decisions", "index.json");
  const outputs: Array<[string, string]> = [
    [registryPath, stableJson(registry)],
    [decisionsPath, stableJson(decisions)],
  ];
  const changed: string[] = [];

  if (options.check) {
    for (const [path, content] of outputs) if (!checkContent(path, content)) changed.push(path);
  } else {
    mkdirSync(resolve(options.brainRoot, "registry"), { recursive: true });
    mkdirSync(resolve(options.brainRoot, "decisions"), { recursive: true });
    for (const [path, content] of outputs) if (writeIfChanged(path, content)) changed.push(path);
  }

  let validationIssues = 0;
  if (!options.check || changed.length === 0) {
    validationIssues = loadBrain(options.brainRoot).issues.length;
  }

  return {
    registryCount: registry.length,
    decisionCount: decisions.length,
    changed,
    valid: validationIssues === 0 && (!options.check || changed.length === 0),
    validationIssues,
  };
}

function main(): void {
  const args = parseCliArgs(process.argv.slice(2));
  const repoRoot = resolve(argString(args, "repo-root") ?? process.cwd());
  const brainRoot = resolve(repoRoot, argString(args, "brain-root") ?? "brain");
  const check = args.has("check");
  const result = runIngest({ repoRoot, brainRoot, check });
  process.stdout.write(stableJson(result));
  if (check && !result.valid) process.exitCode = 1;
  if (!check && result.validationIssues > 0) process.exitCode = 1;
}

const entry = process.argv[1]?.replace(/\\/g, "/");
if (entry?.endsWith("/ingest.ts") || entry?.endsWith("/ingest.js")) main();
