import { describe, expect, it } from "vitest";

describe("POST /api/stealth-recruiter/scan (retired)", () => {
  it("returns 410 Gone for any request (early return before auth/business logic)", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/stealth-recruiter/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minScore: 60, generateNew: true }),
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(410);
    expect(json.error).toMatch(/natrvalo vypnutý/i);
    expect(json.reference).toMatch(/FOUNDER\.md/);
  });
});
