import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * createActivity() without a client falls back to the browser Supabase
 * singleton. On the server that client has no session, runs as `anon`, and the
 * activities INSERT policy (authenticated only) rejects the row. Scheduled
 * events answered 400 after saving the event; Stripe webhook activities were
 * silently dropped. Server code must pass a request-scoped or service-role client.
 */

const CRM_ROOT = process.cwd();

/** Known unscoped callers, each needing its own analysis. Shrink, never grow. */
const KNOWN_DEBT = new Set([
  "src/lib/ai/matching-engine.ts",
  "src/lib/ai-scoring-store.ts",
  "src/lib/integrations-store.ts",
  "src/lib/notification-store.ts",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (entry !== "__tests__" && entry !== "node_modules") walk(p, out);
    } else if (/\.tsx?$/.test(entry)) out.push(p);
  }
  return out;
}

/** Returns the line numbers of createActivity(...) calls with a single argument. */
function unscopedCalls(source: string): number[] {
  const lines: number[] = [];
  const re = /(?<!function\s)createActivity\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    let depth = 0;
    let topLevelCommas = 0;
    let lastNonSpace = "";
    for (let i = m.index + "createActivity".length; i < source.length; i++) {
      const c = source[i];
      if ("({[".includes(c)) depth++;
      else if (")}]".includes(c)) {
        depth--;
        if (depth === 0) break;
      } else if (c === "," && depth === 1) topLevelCommas++;
      if (!/\s/.test(c)) lastNonSpace = c;
    }
    const args = topLevelCommas + 1 - (lastNonSpace === "," ? 1 : 0);
    if (args < 2) lines.push(source.slice(0, m.index).split("\n").length);
  }
  return lines;
}

describe("[verification] server code never writes activities through the browser client", () => {
  const files = walk(join(CRM_ROOT, "src")).filter((f) => {
    const text = readFileSync(f, "utf8");
    return text.includes("createActivity(") && !text.startsWith('"use client"');
  });

  it("finds the call sites (guards the scanner itself)", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it("every server call passes a client, except the listed known debt", () => {
    const offenders = files
      .map((f) => ({ file: relative(CRM_ROOT, f).replace(/\\/g, "/"), lines: unscopedCalls(readFileSync(f, "utf8")) }))
      .filter((x) => x.lines.length > 0 && !KNOWN_DEBT.has(x.file))
      .map((x) => `${x.file}:${x.lines.join(",")}`);
    expect(offenders).toEqual([]);
  });

  it("known debt is still debt (remove fixed files from the list)", () => {
    for (const file of KNOWN_DEBT) {
      expect(unscopedCalls(readFileSync(join(CRM_ROOT, file), "utf8")).length, file).toBeGreaterThan(0);
    }
  });
});
