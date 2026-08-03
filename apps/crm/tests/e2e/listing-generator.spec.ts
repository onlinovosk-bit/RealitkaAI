import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test, expect } from "@playwright/test";
import { assertNotProduction } from "../helpers/env-guard";
import mockPayload from "../fixtures/listing-generator/mock-listing-response.json";
import type { ListingContent } from "@/lib/ai/listing-content";
import type { ListingVariants } from "@/lib/ai/listing-variants";
import { getAdminClient } from "./helpers/valuation-db";
import {
  deleteGeneration,
  fetchGenerationRow,
  getAgencyIdForTestUser,
  seedDraftGeneration,
} from "./helpers/listing-gen-db";

assertNotProduction();

const FIXTURE = mockPayload as {
  content: ListingContent;
  variants: ListingVariants;
};

const VARIANT_LABELS = ["Vysoko konverznĂ˝", "Fakty na stĂ´l", "PrĂ­beh miesta", "ÄŚestnĂ˝ inzerĂˇt"];

test.describe("Listing generator â€” /inzerat-generator", () => {
  test("login session renders generator page", async ({ page }) => {
    const response = await page.goto("/inzerat-generator");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /GenerĂˇtor inzerĂˇtu/i })).toBeVisible();
    await expect(page.getByLabel(/Typ nehnuteÄľnosti/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /VygenerovaĹĄ texty/i })).toBeDisabled();
  });

  test("form rejects generate without required fields", async ({ page }) => {
    await page.goto("/inzerat-generator");
    const generateBtn = page.getByRole("button", { name: /VygenerovaĹĄ texty/i });
    await expect(generateBtn).toBeDisabled();

    await page.getByLabel(/Typ nehnuteÄľnosti/i).fill("3-izbovĂ˝ byt");
    await expect(generateBtn).toBeDisabled();

    await page.getByLabel(/Lokalita/i).fill("PreĹˇov");
    await page.getByLabel(/VĂ˝mera \(mÂ˛\)/i).fill("72");
    await page.getByLabel(/Cena \(â‚¬\)/i).fill("165000");
    await expect(generateBtn).toBeEnabled();
  });
});

test.describe("Listing generator happy path (mocked AI)", () => {
  test.describe.configure({ mode: "serial" });

  let generationId: string;
  let agencyId: string;

  test.beforeAll(async () => {
    const email = process.env.TEST_USER_EMAIL;
    if (!email) {
      test.skip(true, "TEST_USER_EMAIL missing");
      return;
    }
    agencyId = await getAgencyIdForTestUser(email);
  });

  test.beforeEach(async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    if (!email) {
      test.skip(true, "TEST_USER_EMAIL missing");
      return;
    }

    if (!agencyId) {
      test.skip(true, "agencyId not resolved (TEST_USER_EMAIL / DB)");
      return;
    }

    generationId = randomUUID();
    await seedDraftGeneration({
      id: generationId,
      agencyId,
      content: FIXTURE.content,
      variants: FIXTURE.variants,
    });

    await page.route("**/api/ai/listing-content", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          content: FIXTURE.content,
          variants: FIXTURE.variants,
          generationId,
          credits: { cost: 2, charged: false, enforced: false },
        }),
      });
    });
  });

  test.afterEach(async () => {
    if (generationId) {
      await deleteGeneration(generationId).catch(() => undefined);
    }
  });

  test("generate, variant mix, save, reload API persistence", async ({ page, request }) => {
    await page.goto("/inzerat-generator");

    await page.getByLabel(/Typ nehnuteÄľnosti/i).fill("3-izbovĂ˝ byt");
    await page.getByLabel(/Lokalita/i).fill("PreĹˇov");
    await page.getByLabel(/VĂ˝mera \(mÂ˛\)/i).fill("72");
    await page.getByLabel(/Cena \(â‚¬\)/i).fill("165000");

    await page.getByRole("button", { name: /VygenerovaĹĄ texty/i }).click();

    await expect(page.getByText(/VygenerovanĂ© texty/i)).toBeVisible({ timeout: 15_000 });

    const channelCards = page.locator("article").filter({ has: page.getByRole("button", { name: "Vysoko konverznĂ˝", exact: true }) });
    await expect(channelCards).toHaveCount(5);

    for (let i = 0; i < 5; i += 1) {
      const card = channelCards.nth(i);
      for (const label of VARIANT_LABELS) {
        await expect(card.getByRole("button", { name: label, exact: true })).toBeVisible();
      }
    }

    for (const keyword of FIXTURE.content.seo_keywords) {
      await expect(page.getByText(keyword, { exact: true })).toBeVisible();
    }

    const portalCard = channelCards.filter({ hasText: /Text na portĂˇl/i }).first();
    const portalField = portalCard.locator("textarea");
    await expect(portalField).toHaveValue("PORTAL_CONVERSION_TEXT");

    await portalCard.getByRole("button", { name: "PrĂ­beh miesta", exact: true }).click();
    await expect(portalField).toHaveValue("PORTAL_STORY_TEXT");

    const editedPortal = "PORTAL_STORY_TEXT â€” makler upravil";
    await portalField.fill(editedPortal);

    await page.getByRole("button", { name: /UloĹľiĹĄ Ăşpravy/i }).click();
    await expect(page.getByText(/UloĹľenĂ© o/i)).toBeVisible({ timeout: 10_000 });

    await page.reload({ waitUntil: "load" });

    const listRes = await request.get("/api/ai/listing-content/generations");
    expect(listRes.status()).toBe(200);
    const listBody = (await listRes.json()) as {
      ok?: boolean;
      items?: Array<{
        id: string;
        editedOutput?: ListingContent | null;
        chosenVariants?: Record<string, string> | null;
      }>;
    };

    expect(listBody.ok).toBe(true);
    const row = listBody.items?.find((item) => item.id === generationId);
    expect(row, "generation missing from GET /generations").toBeTruthy();
    expect(row?.editedOutput?.portal_text).toBe(editedPortal);
    expect(row?.chosenVariants?.portal_text).toBe("story");

    const admin = getAdminClient();
    const dbRow = await fetchGenerationRow(admin, generationId);
    expect(dbRow.edited_output?.portal_text).toBe(editedPortal);
    expect(dbRow.chosen_variants?.portal_text).toBe("story");
  });
});

