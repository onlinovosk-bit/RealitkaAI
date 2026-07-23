import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const IGNORED_SEGMENTS = new Set([
  ".git",
  ".next",
  ".worktrees",
  "coverage",
  "dist",
  "node_modules",
  "output",
  "tmp",
]);

export function slash(value: string): string {
  return value.replace(/\\/g, "/");
}

export function isoDate(value = new Date()): string {
  return value.toISOString().slice(0, 10);
}

export function parseCliArgs(argv: string[]): Map<string, string | true> {
  const result = new Map<string, string | true>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const equals = token.indexOf("=");
    if (equals > 2) {
      result.set(token.slice(2, equals), token.slice(equals + 1));
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      result.set(token.slice(2), next);
      index += 1;
    } else {
      result.set(token.slice(2), true);
    }
  }
  return result;
}

export function argString(args: Map<string, string | true>, key: string): string | undefined {
  const value = args.get(key);
  return typeof value === "string" ? value : undefined;
}

function isGitRepository(repoRoot: string): boolean {
  return existsSync(resolve(repoRoot, ".git"));
}

export function listFiles(repoRoot: string, inputs: string[]): string[] {
  const tracked = git(repoRoot, ["ls-files", "-z", "--", ...inputs]);
  if (tracked !== undefined) {
    return tracked
      .split("\0")
      .filter(Boolean)
      .map(slash)
      .filter((file) => !file.split("/").some((segment) => IGNORED_SEGMENTS.has(segment)))
      .sort((left, right) => left.localeCompare(right));
  }

  if (isGitRepository(repoRoot)) {
    throw new Error(`git ls-files failed for repository root: ${repoRoot}`);
  }

  // Fixture roots are not Git repositories; this fallback stays within the
  // caller-provided paths and never runs for the real repository.
  const files = new Set<string>();

  function walk(absolute: string): void {
    if (!existsSync(absolute)) return;
    const stats = statSync(absolute);
    if (stats.isFile()) {
      files.add(slash(relative(repoRoot, absolute)));
      return;
    }
    if (!stats.isDirectory()) return;

    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      if (IGNORED_SEGMENTS.has(entry.name)) continue;
      walk(join(absolute, entry.name));
    }
  }

  for (const input of inputs) walk(resolve(repoRoot, input));
  return [...files].sort((left, right) => left.localeCompare(right));
}

function normalizeNewlines(content: string): string {
  return content.replace(/\r\n/g, "\n");
}

export function digestFiles(repoRoot: string, files: string[]): string {
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file);
    hash.update("\0");
    hash.update(normalizeNewlines(readFileSync(resolve(repoRoot, file), "utf8")));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

function git(repoRoot: string, args: string[]): string | undefined {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}
const gitMetadataCache = new Map<string, {
  commit: string;
  createdAt: string;
  lastVerifiedAt: string;
}>();


export function gitMetadata(repoRoot: string, sourcePath: string): {
  commit: string;
  createdAt: string;
  lastVerifiedAt: string;
} {
  const cacheKey = `${repoRoot}\0${sourcePath}`;
  const cached = gitMetadataCache.get(cacheKey);
  if (cached) return cached;
  const today = isoDate();
  const lines = git(repoRoot, ["log", "--format=%H%x09%cs", "--", sourcePath])
    ?.split(/\r?\n/)
    .filter(Boolean) ?? [];
  const [commit = "uncommitted", newest = today] = lines[0]?.split("\t") ?? [];
  const [, oldest = newest] = lines.at(-1)?.split("\t") ?? [];
  const metadata = { commit, createdAt: oldest, lastVerifiedAt: newest };
  gitMetadataCache.set(cacheKey, metadata);
  return metadata;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
}

export function stableJson(value: unknown): string {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

export function writeIfChanged(path: string, content: string): boolean {
  const previous = existsSync(path) ? readFileSync(path, "utf8") : undefined;
  if (previous === content) return false;
  writeFileSync(path, content, "utf8");
  return true;
}

export function ensureParent(path: string): void {
  const parent = dirname(path);
  if (!existsSync(parent)) throw new Error(`Output directory does not exist: ${parent}`);
}

export function readText(repoRoot: string, path: string): string | undefined {
  const absolute = resolve(repoRoot, path);
  return existsSync(absolute) && statSync(absolute).isFile()
    ? readFileSync(absolute, "utf8")
    : undefined;
}
