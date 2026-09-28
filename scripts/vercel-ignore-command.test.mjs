#!/usr/bin/env node
/**
 * V1 — four cases for Vercel ignoreCommand semantics.
 *
 * Vercel: exit 0 = SKIP build, exit 1 = BUILD.
 * Project Root Directory is apps/crm | apps/marketing, so the command runs
 * with cwd = that folder and watches `.` (not apps/crm/).
 *
 * The command under test is READ FROM apps/crm/vercel.json, never hardcoded.
 * #578 hardcoded it here and the harness stayed green while the real file
 * carried the command under `git.ignoreCommand` — a key Vercel does not read,
 * so nothing ever ran in a build. A copy here can drift; a read cannot.
 *
 * The key is also asserted: `ignoreCommand` is a TOP-LEVEL vercel.json property.
 * The `git` object only accepts `deploymentEnabled`.
 *
 * Run: node scripts/vercel-ignore-command.test.mjs
 * Mutation (V2): node scripts/vercel-ignore-command.test.mjs --mutate-bad-grep
 *   → same expects; mixed case must FAIL (inverted grep skips build).
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
import { spawnSync } from "node:child_process";

/**
 * JSON.parse silently keeps the LAST of duplicate keys. A botched merge on
 * 2026-09-23 left two `ignoreCommand` keys in apps/crm/vercel.json — valid
 * JSON, parsed clean, and the intended command silently discarded. Vercel
 * rejected the sibling file outright ("Invalid vercel.json file provided").
 * Both classes are caught here, before a deployment finds them.
 *
 * A JSON.parse reviver cannot see duplicates (they are already collapsed by
 * the time it runs), so the raw text is scanned for repeated keys in the
 * top-level object — where every vercel.json setting lives.
 */
function duplicateTopLevelKey(raw) {
  const seen = new Set();
  let depth = 0;
  let inStr = false;
  let esc = false;
  let cur = null;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') {
        inStr = false;
        if (depth === 1 && cur !== null) {
          // a string that closes at depth 1 is a key only if ':' follows
          const rest = raw.slice(i + 1).match(/^\s*:/);
          if (rest) {
            if (seen.has(cur)) return cur;
            seen.add(cur);
          }
        }
        cur = null;
      } else if (depth === 1) cur = (cur ?? "") + c;
      continue;
    }
    if (c === '"') { inStr = true; cur = depth === 1 ? "" : null; }
    else if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") depth--;
  }
  return null;
}

/** Read the command from the file Vercel actually reads — no hardcoded copy. */
function loadIgnoreCommand(relPath) {
  const raw = readFileSync(join(REPO_ROOT, relPath), "utf8");
  let cfg;
  try {
    cfg = JSON.parse(raw);
  } catch (err) {
    throw new Error(`${relPath}: invalid JSON — Vercel rejects the whole file. ${err.message}`);
  }
  const dup = duplicateTopLevelKey(raw);
  if (dup) {
    throw new Error(
      `${relPath}: duplicate top-level key "${dup}" — JSON.parse keeps only the last one, ` +
        `so the other value is silently discarded.`,
    );
  }
  if (cfg.git && "ignoreCommand" in cfg.git) {
    throw new Error(
      `${relPath}: ignoreCommand sits under "git". Vercel does not read that key ` +
        `(the git object only accepts deploymentEnabled) — move it to top level.`,
    );
  }
  if (typeof cfg.ignoreCommand !== "string" || !cfg.ignoreCommand.trim()) {
    throw new Error(`${relPath}: missing top-level "ignoreCommand" string.`);
  }
  return cfg.ignoreCommand;
}

const GOOD = loadIgnoreCommand("apps/crm/vercel.json");

// marketing carries the same command minus the migrations exclusion; assert it
// is present and well-formed so the second project cannot silently drift.
loadIgnoreCommand("apps/marketing/vercel.json");
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
