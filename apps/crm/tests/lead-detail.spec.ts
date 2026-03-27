import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

test.describe('Lead detail flow', () => {
  test('Loads lead detail and AI recommendations', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'demo@realitka.ai');
    await page.fill('input[name="password"]', 'demo1234');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Go to leads page
    await page.goto(`${BASE_URL}/leads`);
    // Wait for at least one lead row
    await page.waitForSelector('[data-lead-id]');
    // Click the first lead row
    const firstLead = await page.locator('[data-lead-id]').first();
    const leadId = await firstLead.getAttribute('data-lead-id');
    await firstLead.click();
    await page.waitForURL(new RegExp(`/leads/${leadId}`));

    // Check lead detail loaded
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=AI odporúčania')).toBeVisible();
    await expect(page.locator('.ai-panel')).toBeVisible();
  });
});
