import { test, expect } from "@playwright/test";

test.describe("Valuation widget — /odhad/reality-smolko", () => {
  test("public page renders property step on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto("/odhad/reality-smolko");
    if (response?.status() === 404) {
      test.skip(true, "Tenant not seeded in this environment");
      return;
    }

    await expect(page.getByText(/Orientačný odhad/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Zobraziť orientačný odhad/i })).toBeVisible();
  });

  test("estimate API returns band for Košice byt", async ({ request }) => {
    const res = await request.post("/api/valuation/estimate", {
      data: {
        propertyType: "byt",
        location: "Košice",
        sqm: 75,
      },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok?: boolean; estimate?: { low?: number; high?: number } };
    expect(body.ok).toBe(true);
    expect(body.estimate?.low).toBeGreaterThan(0);
    expect(body.estimate?.high).toBeGreaterThan(body.estimate?.low ?? 0);
  });

  test("honeypot on submit returns ok without side effects", async ({ request }) => {
    const res = await request.post("/api/valuation/submit", {
      data: { hp: "bot", agencySlug: "reality-smolko" },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok?: boolean };
    expect(body.ok).toBe(true);
  });
});
