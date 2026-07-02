import { test, expect } from "@playwright/test";

test.describe("Stealth Recruiter API smoke", () => {
  test("POST /api/stealth-recruiter/scan without auth is not 500", async ({ request }) => {
    const resp = await request.post("/api/stealth-recruiter/scan", {
      data: { minScore: 60 },
    });
    expect(resp.status(), await resp.text()).not.toBe(500);
    expect([401, 403]).toContain(resp.status());
  });

  test("POST /api/stealth-recruiter/outreach without auth is not 500", async ({ request }) => {
    const resp = await request.post("/api/stealth-recruiter/outreach", {
      data: { address: "Smoke Test 1", action: "generate" },
    });
    expect(resp.status(), await resp.text()).not.toBe(500);
    expect([401, 403]).toContain(resp.status());
  });
});
