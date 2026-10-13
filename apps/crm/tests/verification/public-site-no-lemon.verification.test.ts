/**
 * Verejný marketing a public/marketing stránky CRM nesmú odkazovať na Lemon Squeezy.
 * Platby sú Stripe; nákupné CTA v2 vedú do registrácie alebo na demo.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../../../..");
const TREES = [
  "apps/marketing/app",
  "apps/marketing/components",
  "apps/marketing/lib",
  "apps/marketing/public",
  "apps/crm/src/app/(marketing)",
  "apps/crm/src/app/(public)",
  "apps/crm/src/components/marketing",
];
const EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".html", ".css", ".json", ".md"]);
const LEMON = /lemon\s*squeezy|lemonsqueezy|revolis\.lemonsqueezy/i;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "__golden__" || name === "__tests__") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if ([...EXT].some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

describe("verejný web bez Lemon Squeezy", () => {
  it("žiadny súbor verejného webu nespomína Lemon Squeezy", () => {
    const hits: string[] = [];
    for (const tree of TREES) {
      const dir = join(ROOT, tree);
      for (const file of walk(dir)) {
        const text = readFileSync(file, "utf8");
        if (LEMON.test(text)) hits.push(relative(ROOT, file));
      }
    }
    expect(hits).toEqual([]);
  });
});
