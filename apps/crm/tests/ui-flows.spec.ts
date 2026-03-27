import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

test.describe('UI elements and loading states', () => {
  test('Leads page shows loading state', async ({ page }) => {
    await page.goto(`${BASE_URL}/leads`);
    // Simulate slow API by delaying response
    await page.route('**/api/leads', async (route) => {
      await new Promise((res) => setTimeout(res, 2000));
      route.continue();
    });
    await expect(page.locator('text=Načítavam lead')).toBeVisible();
  });

  test('AI panel is visible on dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.locator('text=AI odporúčania')).toBeVisible();
    await expect(page.locator('.ai-panel')).toBeVisible();
  });

  test('Error state is visible if API returns error', async ({ page }) => {
    await page.route('**/api/leads', route => route.fulfill({ status: 500, body: 'Internal Server Error' }));
    await page.goto(`${BASE_URL}/leads`);
    await expect(page.locator('text=Leady sa nepodarilo načítať')).toBeVisible();
  });
});
