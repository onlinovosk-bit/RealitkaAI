import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildDecisions, buildRegistry } from "./catalog.js";
import { loadBrain } from "./loader.js";
import { argString, parseCliArgs, stableJson, writeIfChanged } from "./repo.js";

export interface IngestResult {
  registryCount: number;
  decisionCount: number;
  changed: string[];
  valid: boolean;
  validationIssues: number;
}

function checkContent(path: string, expected: string): boolean {
  return existsSync(path) && readFileSync(path, "utf8") === expected;
}

export function runIngest(options: {
  repoRoot: string;
  brainRoot: string;
  check?: boolean;
}): IngestResult {
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
