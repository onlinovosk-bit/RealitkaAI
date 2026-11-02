import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

/**
 * Živá špec: fulfillment email doručuje /api/starter-pack/download?token=…
 * kupujúcemu bez session. Proxy allowlist musí obsahovať PRESNE túto cestu;
 * sesterské cesty zostávajú za session bránou.
 */
describe("[verification] starter-pack download is proxy-public", () => {
  it("PUBLIC_PATHS includes exact /api/starter-pack/download", () => {
    const proxy = readFileSync(join(CRM_ROOT, "src/proxy.ts"), "utf8");
    const match = proxy.match(/const PUBLIC_PATHS = new Set\(\[([\s\S]*?)\]\);/);
    expect(match, "PUBLIC_PATHS must remain an explicit path set").toBeTruthy();
    const body = match![1];
    expect(body).toContain('"/api/starter-pack/download"');
    // Exact path only — do not open the parent or redeem siblings via allowlist.
    expect(body).not.toContain('"/api/starter-pack"');
    expect(body).not.toContain('"/api/billing/redeem-code"');
  });
});
