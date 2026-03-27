import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

test.describe('AI Recommendations flow', () => {
  test('AI recommendations are visible on dashboard and lead detail', async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'demo@realitka.ai');
    await page.fill('input[name="password"]', 'demo1234');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Dashboard AI recommendations
    await expect(page.locator('text=AI odporúčania')).toBeVisible();
    await expect(page.locator('.ai-panel')).toBeVisible();

    // Go to leads page
    await page.goto(`${BASE_URL}/leads`);
    await page.waitForSelector('[data-lead-id]');
    // Click the first lead row
    const firstLead = await page.locator('[data-lead-id]').first();
    const leadId = await firstLead.getAttribute('data-lead-id');
    await firstLead.click();
    await page.waitForURL(new RegExp(`/leads/${leadId}`));

    // Lead detail AI recommendations
    await expect(page.locator('text=AI odporúčania')).toBeVisible();
    await expect(page.locator('.ai-panel')).toBeVisible();
  });
});
