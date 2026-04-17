import { test, expect } from "@playwright/test";

/**
 * Landing /landing — sekcia kalkulačky návratnosti (SK texty + mobile vizuál).
 */
test.describe("Landing — kalkulačka návratnosti", () => {
  test("slovenské texty a čitateľná tabuľka sliderov na mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/landing");
    await expect(page.getByText("Kalkulačka návratnosti")).toBeVisible();
    await expect(page.getByText(/Konverzia dopytov na obchod \(\%\):/)).toBeVisible();
    const section = page.locator("section").filter({ hasText: "Koľko mesačne uniká" }).first();
    await expect(section).toBeVisible();
    await section.screenshot({ path: "test-results/landing-roi-mobile.png" });
  });
});
