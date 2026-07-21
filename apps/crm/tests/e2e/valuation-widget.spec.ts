import { test, expect } from "@playwright/test";

test.describe("Valuation widget — /odhad/reality-smolko", () => {
  test("public page renders property step first on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto("/odhad/reality-smolko");
    if (response?.status() === 404) {
      test.skip(true, "Tenant not seeded in this environment");
      return;
    }

    await expect(page.getByText(/Krok 1 z 3 · Nehnuteľnosť/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Pokračovať na kontakt/i })).toBeVisible();
    await expect(page.getByText(/Krok 2 z 3/i)).not.toBeVisible();
  });

  test("estimate API allows variant B preview without contact", async ({ request }) => {
    const blocked = await request.post("/api/valuation/estimate", {
      data: {
        propertyType: "byt",
        location: "Košice",
        sqm: 75,
      },
    });
    expect(blocked.status()).toBe(400);

    const preview = await request.post("/api/valuation/estimate", {
      data: {
        propertyType: "byt",
        location: "Košice",
        sqm: 75,
        abVariant: "B",
        sessionId: "test-session-preview-001",
      },
    });
    expect(preview.status()).toBe(200);

    const res = await request.post("/api/valuation/estimate", {
      data: {
        propertyType: "byt",
        location: "Košice",
        sqm: 75,
        name: "Test User",
        email: "test@example.com",
        phone: "0900123456",
        privacyAck: true,
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

test.describe("Valuation widget — /odhad/demo sandbox", () => {
  test("demo page shows sandbox badge when tenant seeded", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto("/odhad/demo");
    if (response?.status() === 404) {
      test.skip(true, "Demo tenant not seeded in this environment");
      return;
    }

    await expect(page.getByText(/Ukážková verzia/i)).toBeVisible();
    await expect(page.getByText(/Krok 1 z 3 · Nehnuteľnosť/i)).toBeVisible();
  });

  test("sandbox submit returns ok with sandbox flag", async ({ request }) => {
    const res = await request.post("/api/valuation/submit", {
      data: {
        agencySlug: "demo",
        propertyType: "byt",
        location: "Košice",
        sqm: 75,
        name: "Demo User",
        email: "demo@example.com",
        phone: "0900123456",
        sellWithin12Months: false,
        privacyAck: true,
      },
    });
    if (res.status() === 404) {
      test.skip(true, "Demo tenant not seeded");
      return;
    }
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok?: boolean; sandbox?: boolean };
    expect(body.ok).toBe(true);
    expect(body.sandbox).toBe(true);
  });
});
