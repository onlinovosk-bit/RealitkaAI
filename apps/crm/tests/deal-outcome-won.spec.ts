import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

test.describe("Deal outcome won modal (PR-B2)", () => {
  test("Uzavretý requires reason modal and PATCH includes reason_code", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', "demo@realitka.ai");
    await page.fill('input[name="password"]', "demo1234");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    await page.goto(`${BASE_URL}/leads`);
    await page.waitForSelector("[data-lead-id]");
    const firstLead = page.locator("[data-lead-id]").first();
    const leadId = await firstLead.getAttribute("data-lead-id");
    expect(leadId).toBeTruthy();
    await firstLead.click();
    await page.waitForURL(new RegExp(`/leads/${leadId}`));

    const statusSelect = page.getByTestId("lead-status-select");
    await expect(statusSelect).toBeVisible();

    await statusSelect.selectOption("Uzavretý");

    const modal = page.getByTestId("deal-outcome-reason-modal");
    await expect(modal).toBeVisible();

    const patchPromise = page.waitForRequest(
      (req) =>
        req.method() === "PATCH" &&
        req.url().includes(`/api/leads/${leadId}`),
    );

    await page.getByTestId("deal-outcome-reason-select").selectOption("cena");
    await page.getByTestId("deal-outcome-reason-text").fill("E2E won flow");
    await page.getByTestId("deal-outcome-reason-submit").click();

    const patchReq = await patchPromise;
    const body = patchReq.postDataJSON() as {
      status?: string;
      dealOutcomeReasonCode?: string;
      dealOutcomeReasonText?: string;
    };

    expect(body.status).toBe("Uzavretý");
    expect(body.dealOutcomeReasonCode).toBe("cena");
    expect(body.dealOutcomeReasonText).toBe("E2E won flow");

    await expect(modal).toBeHidden({ timeout: 15_000 });
    await expect(statusSelect).toHaveValue("Uzavretý");
  });
});
