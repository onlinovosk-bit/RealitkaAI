import { test, expect } from "@playwright/test";

test.describe("Proof funnel — /proof", () => {
  test("honest copy a kroky dotazníka na mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/proof");

    await expect(page.getByText("Proof of Value")).toBeVisible();
    await expect(page.getByText(/benchmarkov/)).toBeVisible();
    await expect(page.getByText(/Krok 1 \/ 6/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Ďalej" })).toBeVisible();
  });
});
