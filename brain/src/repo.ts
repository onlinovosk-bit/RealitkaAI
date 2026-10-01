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

/** UTF-16 code unit order — stable across Node/OS (CI uses Node 20, dev may use 24). */
export function compareAscii(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
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
  const tracked = gitRaw(repoRoot, ["ls-files", "-z", "--", ...inputs]);
  if (tracked !== undefined) {
    return tracked
      .split("\0")
      .filter(Boolean)
      .map(slash)
      .filter((file) => !file.split("/").some((segment) => IGNORED_SEGMENTS.has(segment)))
      .sort(compareAscii);
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
  return [...files].sort(compareAscii);
}

export function normalizeNewlines(content: string): string {
  return content.replace(/\r\n/g, "\n");
}

function gitRaw(repoRoot: string, args: string[]): string | undefined {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return undefined;
  }
}

function gitTrimmed(repoRoot: string, args: string[]): string | undefined {
  return gitRaw(repoRoot, args)?.trim();
}

function parseGitCatFileBatch(files: string[], stdout: Buffer): Map<string, string> {
  const map = new Map<string, string>();
  let offset = 0;
  let fileIndex = 0;
  while (offset < stdout.length && fileIndex < files.length) {
    const lineEnd = stdout.indexOf(0x0a, offset);
    if (lineEnd === -1) break;
    const header = stdout.subarray(offset, lineEnd).toString("utf8");
    offset = lineEnd + 1;
    const parts = header.split(" ");
    const file = files[fileIndex]!;
    fileIndex += 1;
    if (parts[1] !== "blob") continue;
    const size = Number.parseInt(parts[2] ?? "", 10);
    if (!Number.isFinite(size) || size < 0) continue;
    const content = stdout.subarray(offset, offset + size).toString("utf8");
    offset += size;
    if (stdout[offset] === 0x0a) offset += 1;
    map.set(file, content);
  }
  return map;
}

function readGitHeadPathsBatch(repoRoot: string, files: string[]): Map<string, string> {
  if (files.length === 0) return new Map();
  const stdin = files.map((file) => `HEAD:${file}\n`).join("");
  try {
    const stdout = execFileSync("git", ["cat-file", "--batch"], {
      cwd: repoRoot,
      input: stdin,
      maxBuffer: 64 * 1024 * 1024,
    });
    return parseGitCatFileBatch(files, stdout);
  } catch {
    return new Map();
  }
}

function readDigestUtf8(repoRoot: string, file: string, batch: Map<string, string>): string {
  const fromBatch = batch.get(file);
  if (fromBatch !== undefined) return normalizeNewlines(fromBatch);
  const fromGit = gitRaw(repoRoot, ["show", `HEAD:${file}`]);
  if (fromGit !== undefined) return normalizeNewlines(fromGit);
  return normalizeNewlines(readFileSync(resolve(repoRoot, file), "utf8"));
}

export function digestFiles(repoRoot: string, files: string[]): string {
  const batch = readGitHeadPathsBatch(repoRoot, files);
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file);
    hash.update("\0");
    hash.update(readDigestUtf8(repoRoot, file, batch));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

function git(repoRoot: string, args: string[]): string | undefined {
  return gitTrimmed(repoRoot, args);
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
        .sort(([left], [right]) => compareAscii(left, right))
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
