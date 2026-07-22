import { test, expect } from "@playwright/test";
import {
  countRows,
  demoSubmitPayload,
  getAdminClient,
  smolkoSubmitPayload,
} from "./helpers/valuation-db";

test.describe("Valuation widget — /odhad/reality-smolko", () => {
  test("public page renders property step first on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto("/odhad/reality-smolko");
    expect(response?.status()).toBe(200);

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
    expect(response?.status()).toBe(200);

    await expect(page.getByText(/Ukážková verzia/i)).toBeVisible();
    await expect(page.getByText(/Krok 1 z 3 · Nehnuteľnosť/i)).toBeVisible();
  });

  test("sandbox submit returns ok with sandbox flag", async ({ request }) => {
    const res = await request.post("/api/valuation/submit", {
      data: demoSubmitPayload(String(Date.now())),
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok?: boolean; sandbox?: boolean };
    expect(body.ok).toBe(true);
    expect(body.sandbox).toBe(true);
  });
});

test.describe("Valuation widget — sandbox-gdpr acceptance (brief TESTY CELKU 2–4)", () => {
  test.describe.configure({ mode: "serial" });

  test("2) Smolko submit creates lead + lead_consents (+1 each)", async ({ request }) => {
    const admin = getAdminClient();
    const leadsBefore = await countRows(admin, "leads", { source: "valuation_widget" });
    const consentsBefore = await countRows(admin, "lead_consents");

    const email = `e2e-smolko-${Date.now()}@revolis.test`;
    const res = await request.post("/api/valuation/submit", {
      headers: { "x-forwarded-for": `10.77.1.${Date.now() % 200}` },
      data: smolkoSubmitPayload(email),
    });
    expect(res.status()).toBe(200);

    const body = (await res.json()) as { ok?: boolean; leadId?: string };
    expect(body.ok).toBe(true);
    expect(body.leadId).toBeTruthy();

    expect(await countRows(admin, "leads", { source: "valuation_widget" })).toBe(leadsBefore + 1);
    expect(await countRows(admin, "lead_consents")).toBe(consentsBefore + 1);

    const { data: consent, error } = await admin
      .from("lead_consents")
      .select("lead_id, tenant_slug, privacy_policy_version")
      .eq("lead_id", body.leadId!)
      .maybeSingle();

    expect(error).toBeNull();
    expect(consent?.tenant_slug).toBe("reality-smolko");
    expect(consent?.privacy_policy_version).toBeTruthy();
  });

  test("3) Smolko without GDPR checkbox returns 4xx and writes nothing", async ({ request }) => {
    const admin = getAdminClient();
    const leadsBefore = await countRows(admin, "leads", { source: "valuation_widget" });
    const consentsBefore = await countRows(admin, "lead_consents");

    const payload = smolkoSubmitPayload(`e2e-no-gdpr-${Date.now()}@revolis.test`);
    const { privacyAck: _removed, ...withoutGdpr } = payload;

    const res = await request.post("/api/valuation/submit", {
      headers: { "x-forwarded-for": `10.77.2.${Date.now() % 200}` },
      data: withoutGdpr,
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);

    expect(await countRows(admin, "leads", { source: "valuation_widget" })).toBe(leadsBefore);
    expect(await countRows(admin, "lead_consents")).toBe(consentsBefore);
  });

  test("4) Sandbox rate limit returns 429 on 6th submit from same IP", async ({ request }) => {
    const ip = `10.66.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
    const headers = { "x-forwarded-for": ip };

    for (let i = 1; i <= 5; i += 1) {
      const res = await request.post("/api/valuation/submit", {
        headers,
        data: demoSubmitPayload(`${ip}-${i}-${Date.now()}`),
      });
      expect(res.status(), `submit ${i}/5`).toBe(200);
    }

    const blocked = await request.post("/api/valuation/submit", {
      headers,
      data: demoSubmitPayload(`${ip}-6-${Date.now()}`),
    });
    expect(blocked.status()).toBe(429);
  });
});
