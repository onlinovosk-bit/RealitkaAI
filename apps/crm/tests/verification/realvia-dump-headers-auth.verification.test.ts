import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CRM_ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(CRM_ROOT, rel), "utf8");
}

describe("[verification] Realvia dump=headers requires cron auth", () => {
  it("gates dump=headers and diag=config through hasCronAuthorization", () => {
    const route = read("src/app/api/webhooks/realvia/route.ts");

    expect(route).toContain("function hasCronAuthorization");
    expect(route).toContain("process.env.CRON_SECRET?.trim()");
    expect(route).toContain("request.headers.get('authorization')");
    expect(route).toContain("`Bearer ${cronSecret}`");

    const dumpBlock = route.slice(
      route.indexOf("searchParams.get('dump')"),
      route.indexOf("searchParams.get('diag')"),
    );
    expect(dumpBlock).toContain("hasCronAuthorization(request)");
    expect(dumpBlock).toContain("status: 401");

    const diagBlock = route.slice(route.indexOf("searchParams.get('diag')"));
    expect(diagBlock).toContain("hasCronAuthorization(request)");
    expect(diagBlock).not.toMatch(
      /const cronSecret = process\.env\.CRON_SECRET\?\.trim\(\);/,
    );
  });

  it("redacts authorization and Vercel proxy headers in collectRequestHeaders", () => {
    const validate = read("src/lib/realvia/validate.ts");

    expect(validate).toContain("lower === 'authorization'");
    expect(validate).toContain("lower === 'x-vercel-oidc-token'");
    expect(validate).toContain("lower === 'x-vercel-proxy-signature'");
    expect(validate).toContain("lower === 'x-vercel-sc-headers'");
    expect(validate).toContain("headersMap[key] = '[REDACTED]'");
  });
});
