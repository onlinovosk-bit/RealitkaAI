import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

function makeRequest(secret: string | null, query = ""): NextRequest {
  const init: ConstructorParameters<typeof NextRequest>[1] = {};
  if (secret) {
    init.headers = { authorization: `Bearer ${secret}` };
  }
  return new NextRequest(
    `http://localhost/api/cron/stealth-recruiter-ingest${query}`,
    init,
  );
}

describe("GET /api/cron/stealth-recruiter-ingest (retired)", () => {
  it("returns 410 Gone without Bearer (auth never reached)", async () => {
    const res = await GET(makeRequest(null));
    const json = await res.json();
    expect(res.status).toBe(410);
    expect(json.error).toMatch(/natrvalo vypnutý/i);
  });

  it("returns 410 Gone even with CRON_SECRET", async () => {
    const res = await GET(makeRequest("test-cron-secret", "?region=Prešov"));
    const json = await res.json();
    expect(res.status).toBe(410);
    expect(json.error).toMatch(/natrvalo vypnutý/i);
    expect(json.reference).toMatch(/FOUNDER\.md/);
  });
});
