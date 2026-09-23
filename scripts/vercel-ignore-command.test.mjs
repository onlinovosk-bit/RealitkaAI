#!/usr/bin/env node
/**
 * V1 — four cases for Vercel ignoreCommand semantics.
 *
 * Vercel: exit 0 = SKIP build, exit 1 = BUILD.
 * Project Root Directory is apps/crm | apps/marketing, so the command runs
 * with cwd = that folder and watches `.` (not apps/crm/).
 *
 * Canonical command (must match apps/crm and apps/marketing vercel.json):
 *   git diff --quiet HEAD^ HEAD -- . && exit 0 || exit 1
 *
 * Run: node scripts/vercel-ignore-command.test.mjs
 * Mutation (V2): node scripts/vercel-ignore-command.test.mjs --mutate-bad-grep
 *   → same expects; mixed case must FAIL (inverted grep skips build).
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const GOOD =
  "git diff --quiet HEAD^ HEAD -- . && exit 0 || exit 1";
/** PR #155 inverted logic — wrongly SKIPs when any path is outside apps/crm. */
const BAD =
  "git diff HEAD^ HEAD --name-only | grep -qvE '^apps/crm/' && exit 0 || exit 1";

const mutate = process.argv.includes("--mutate-bad-grep");
const commandUnderTest = mutate ? BAD : GOOD;

function git(cwd, args, check = true) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (check && r.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${r.stderr || r.stdout}`);
  }
  return r;
}

/** Prefer Git Bash; Windows `bash.exe` is often a broken WSL stub. */
function resolveBash() {
  const candidates = [
    process.env.GIT_BASH,
    "C:/Program Files/Git/bin/bash.exe",
    "C:/Program Files/Git/usr/bin/bash.exe",
    "/usr/bin/bash",
    "bash",
  ].filter(Boolean);
  for (const bin of candidates) {
    const probe = spawnSync(bin, ["-c", "echo ok"], { encoding: "utf8" });
    if (probe.status === 0 && (probe.stdout || "").includes("ok")) return bin;
  }
  throw new Error("No working bash found (need Git Bash on Windows)");
}

const BASH = resolveBash();

/** Run ignoreCommand as Vercel would: cwd = project Root Directory. */
function sh(projectCwd, script) {
  // Avoid bash -l (login). Convert Windows paths for Git Bash.
  const unixCwd = projectCwd.replace(/\\/g, "/").replace(/^([A-Za-z]):/, "/$1");
  const r = spawnSync(BASH, ["-c", `cd "$1" && eval "$2"`, "_", unixCwd, script], {
    encoding: "utf8",
    env: process.env,
  });
  return r.status ?? 1;
}

function setupRepo() {
  const root = mkdtempSync(join(tmpdir(), "vercel-ignore-"));
  git(root, ["init", "-q"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "test"]);
  mkdirSync(join(root, "apps/crm/src"), { recursive: true });
  mkdirSync(join(root, "apps/marketing"), { recursive: true });
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(join(root, "apps/crm/src/a.ts"), "a\n");
  writeFileSync(join(root, "apps/marketing/page.tsx"), "m\n");
  writeFileSync(join(root, "docs/x.md"), "d\n");
  git(root, ["add", "-A"]);
  git(root, ["commit", "-qm", "base"]);
  return root;
}

function commitFiles(root, files) {
  for (const f of files) {
    const abs = join(root, f);
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, `chg-${Date.now()}-${Math.random()}\n`);
  }
  git(root, ["add", "-A"]);
  git(root, ["commit", "-qm", `chg ${files.join(",")}`]);
}

function runCase(root, label, files, expectExit) {
  commitFiles(root, files);
  const cwd = join(root, "apps/crm");
  const code = sh(cwd, commandUnderTest);
  const ok = code === expectExit;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}  expect=${expectExit} got=${code}  cmd=${mutate ? "BAD" : "GOOD"}`,
  );
  const base = git(root, ["rev-list", "--max-parents=0", "HEAD"]).stdout.trim();
  git(root, ["checkout", "-q", "-B", "main", base]);
  return ok;
}

function runFailSafe(root) {
  const cwd = join(root, "apps/crm");
  const broken = commandUnderTest.replaceAll("HEAD^", "NOT_A_PARENT_REV");
  const code = sh(cwd, broken);
  const ok = code === 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  fail-safe-bad-rev  expect=1 got=${code}`,
  );
  return ok;
}

const root = setupRepo();
let passed = 0;
let total = 0;
/** @type {Record<string, boolean>} */
const results = {};

// Intentional semantics (always): docs SKIP, crm BUILD, mixed BUILD, error BUILD.
const cases = [
  { label: "docs-only", files: ["docs/x.md"], expect: 0 },
  { label: "crm-only", files: ["apps/crm/src/a.ts"], expect: 1 },
  {
    label: "mixed-docs-and-crm",
    files: ["apps/crm/src/a.ts", "docs/x.md"],
    expect: 1,
  },
];

try {
  for (const c of cases) {
    total++;
    const ok = runCase(root, c.label, c.files, c.expect);
    results[c.label] = ok;
    if (ok) passed++;
  }
  total++;
  const fsOk = runFailSafe(root);
  results["fail-safe-bad-rev"] = fsOk;
  if (fsOk) passed++;
} finally {
  try {
    rmSync(root, { recursive: true, force: true, maxRetries: 5 });
  } catch {
    // Windows temp locks — ignore
  }
}

console.log(`\n${passed}/${total} passed`);

if (mutate) {
  // V2: inverted grep must make mixed fail specifically.
  if (results["mixed-docs-and-crm"] === false) {
    console.log(
      "MUTATION OK: mixed-docs-and-crm failed under grep -qv (inverted logic caught)",
    );
    process.exit(0);
  }
  console.error(
    "MUTATION UNEXPECTED: mixed-docs-and-crm did not fail under bad command",
  );
  process.exit(1);
}

process.exit(passed === total ? 0 : 1);
