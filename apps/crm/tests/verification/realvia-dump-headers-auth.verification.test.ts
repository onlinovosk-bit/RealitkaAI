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
    // Pôvodne `headersMap[key] = '[REDACTED]'`. REALVIA-SEC-01 zlúčilo dve
    // nezávislé verzie redakcie do jednej funkcie `isSensitiveHeaderName`
    // (merge `main` ich predtým zlepil do jedného tela a časť podmienok sa
    // stala nedosiahnuteľnou), takže priradenie je teraz ternárne. Kontroluje
    // sa značka a to, že ju píše redakčná cesta — nie presný tvar príkazu.
    expect(validate).toContain("'[REDACTED]'");
    expect(validate).toContain("isSensitiveHeaderName(key.toLowerCase())");
  });

  it("redacts the identifikator credential pair (REALVIA-SEC-01)", () => {
    // `identifikator`/`identifikator2` sú Mode 1 vo `validateSecret` — primárna
    // produkčná autentifikácia Realvie. Do 2026-10-07 ich redakcia nepokrývala,
    // takže šli v čitateľnej podobe do logu aj do `realvia_webhook_logs`.
    // Prefix, nie presné mená: `identifikator3` by zoznam ticho obišiel.
    const validate = read("src/lib/realvia/validate.ts");
    expect(validate).toContain("lower.startsWith('identifikator')");
  });
});
