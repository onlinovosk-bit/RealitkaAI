import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CRM_ROOT = process.cwd();

describe("[verification] Next 16 proxy session gate", () => {
  it("does not ship the dead apps/crm/middleware.ts (Next 16 uses src/proxy.ts)", () => {
    expect(existsSync(join(CRM_ROOT, "middleware.ts"))).toBe(false);
    expect(existsSync(join(CRM_ROOT, "src/proxy.ts"))).toBe(true);
  });

  it("fail-opens proxy auth on timeout instead of hanging", () => {
    const proxy = readFileSync(join(CRM_ROOT, "src/proxy.ts"), "utf8");
    expect(proxy).toContain("PROXY_AUTH_TIMEOUT_MARKER");
    expect(proxy).toContain("[proxy-auth-timeout]");
    expect(proxy).toContain("createProxyFetch");
  });
});
