import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

test.describe('Error states and API failures', () => {
  test('Shows error when leads API fails', async ({ page }) => {
    // Simulate API failure by intercepting the leads API
    await page.route('**/api/leads', route => route.abort());
    await page.goto(`${BASE_URL}/leads`);
    await expect(page.locator('text=Leady sa nepodarilo načítať')).toBeVisible();
  });

  test('Shows error when not authenticated', async ({ page }) => {
    // Try to access dashboard without login
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/login/);
  });

  test('Legacy team permissions URL does not 404', async ({ page }) => {
    await page.goto(`${BASE_URL}/team/permissions`);
    await expect(page).not.toHaveURL(/team\/permissions$/);
    await expect(page).not.toHaveTitle(/404/i);
  });

  test('Shows error for non-existent lead', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'demo@realitka.ai');
    await page.fill('input[name="password"]', 'demo1234');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    // Try to access a non-existent lead
    await page.goto(`${BASE_URL}/leads/nonexistent-lead-id`);
    // Should redirect or show error
    await expect(page.locator('text=Lead ID nebol nájdený')).toBeVisible();
  });
});
