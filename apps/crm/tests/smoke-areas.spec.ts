import { test, expect } from '@playwright/test';
import { assertNotProduction } from './helpers/env-guard';

assertNotProduction();

// 1. Načítanie leadov
test('Načítanie leadov', async ({ page }) => {
  await page.goto('/leads');
  await expect(page.locator('text=Lead')).toBeVisible();
});
