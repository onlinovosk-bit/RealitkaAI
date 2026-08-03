import { describe, expect, it } from "vitest";

describe("stealth-recruiter API routes (retired)", () => {
  it("POST /scan returns 410 Gone before auth", async () => {
    const { POST } = await import("@/app/api/stealth-recruiter/scan/route");
    const res = await POST(
      new Request("http://localhost/api/stealth-recruiter/scan", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error).toMatch(/natrvalo vypnutý/i);
  });

  it("POST /outreach returns 410 Gone before auth", async () => {
    const { POST } = await import("@/app/api/stealth-recruiter/outreach/route");
    const res = await POST(
      new Request("http://localhost/api/stealth-recruiter/outreach", {
        method: "POST",
        body: JSON.stringify({ address: "Test" }),
      }),
    );

    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error).toMatch(/natrvalo vypnutý/i);
  });
});
