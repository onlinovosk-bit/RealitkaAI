import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CRM_ROOT = process.cwd();
const GMAIL_PULL_PATH = "/api/inbound/gmail-pull";

function read(rel: string): string {
  return readFileSync(join(CRM_ROOT, rel), "utf8");
}

function setBody(source: string, constantName: string): string {
  const match = source.match(
    new RegExp(`const ${constantName} = new Set\\(\\[([\\s\\S]*?)\\]\\);`)
  );
  expect(match, `${constantName} must remain an explicit path set`).not.toBeNull();
  return match?.[1] ?? "";
}

describe("[verification] Gmail inbound pull authentication", () => {
  it("bypasses the session gate only as a bearer-protected service route", () => {
    const proxy = read("src/proxy.ts");

    expect(setBody(proxy, "PUBLIC_PATHS")).not.toContain(`"${GMAIL_PULL_PATH}"`);
    expect(setBody(proxy, "CRON_AUTH_API_PATHS")).toContain(`"${GMAIL_PULL_PATH}"`);
  });

  it("fails closed in the route unless Bearer CRON_SECRET matches", () => {
    const route = read("src/app/api/inbound/gmail-pull/route.ts");

    expect(route).toContain("process.env.CRON_SECRET?.trim()");
    expect(route).toContain('req.headers.get("authorization")');
    expect(route).toContain("`Bearer ${expected}`");
    expect(route).toContain('errorResponse("unauthorized", 401)');
  });
});
