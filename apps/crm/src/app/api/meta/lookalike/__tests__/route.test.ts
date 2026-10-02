import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const leadsRows = vi.hoisted(() => ({ rows: [] as Array<{ email: unknown }> }));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ limit: async () => ({ data: leadsRows.rows, error: null }) }) }),
  }),
}));

import { POST } from "../route";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

function metaFetchMock() {
  return vi.fn(async (url: string, init?: RequestInit) => {
    void init;
    const body = url.endsWith("/users")
      ? {}
      : { id: url.includes("customaudiences") ? "aud_1" : undefined };
    return { json: async () => body } as Response;
  });
}

function call() {
  return POST(
    new Request("http://x/api/meta/lookalike", {
      method: "POST",
      headers: { authorization: "Bearer cron-secret" },
      body: JSON.stringify({ source: "leads_demo" }),
    }),
  );
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "cron-secret");
  vi.stubEnv("META_ACCESS_TOKEN", "tok");
  vi.stubEnv("META_AD_ACCOUNT_ID", "123");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/meta/lookalike — do Meta idú len SHA-256 hashe", () => {
  it("nahráva normalizované hashe, žiadna čistá adresa nie je v žiadnom volaní Meta", async () => {
    leadsRows.rows = [{ email: "  Jan.Novak@Example.SK " }, { email: "jan.novak@example.sk" }, { email: "b@x.sk" }];
    const f = metaFetchMock();
    vi.stubGlobal("fetch", f);

    const res = await call();
    const body = await res.json();

    const upload = f.mock.calls.find(([u]) => String(u).endsWith("/users"))!;
    const sent = JSON.parse(String(upload[1]?.body));
    expect(sent.payload.data).toEqual([[sha("jan.novak@example.sk")], [sha("b@x.sk")]]);
    for (const [, init] of f.mock.calls) {
      const raw = String(init?.body ?? "");
      expect(raw.toLowerCase()).not.toContain("example.sk");
      expect(raw).not.toContain("b@x.sk");
    }
    expect(body.size).toBe(2); // deduplikované, nie 3
  });

  it("riadky bez použiteľného e-mailu nezhodia route a nejdú do Meta", async () => {
    leadsRows.rows = [{ email: null }, { email: "" }, { email: "nie-je-email" }, { email: "ok@x.sk" }];
    const f = metaFetchMock();
    vi.stubGlobal("fetch", f);

    const res = await call();
    expect(res.status).toBe(200);
    const upload = f.mock.calls.find(([u]) => String(u).endsWith("/users"))!;
    expect(JSON.parse(String(upload[1]?.body)).payload.data).toEqual([[sha("ok@x.sk")]]);
  });

  it("bez použiteľných e-mailov vráti 400 a Meta sa nezavolá", async () => {
    leadsRows.rows = [{ email: null }, { email: "x" }];
    const f = metaFetchMock();
    vi.stubGlobal("fetch", f);

    const res = await call();
    expect(res.status).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });
});
