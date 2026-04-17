import { test, expect } from '@playwright/test';

test('Dashboard loads without crash after login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@revolis.ai');
  await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'Oa175072');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await expect(page).toHaveURL(/dashboard/);

  // Dashboard should render without white screen
  await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

  // INC: blog promo row must exist in dashboard chrome (DashboardClientLayout); it sits outside <main>.
  const blogRow = page.locator('section[data-testid="blog-promo-ticker"]');
  await expect(blogRow).toBeVisible({ timeout: 10000 });
  await expect(blogRow.getByRole('link', { name: 'Všetky články' })).toBeVisible();

  // No uncaught JS errors
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  // Wait for data to load
  await page.waitForTimeout(3000);

  expect(errors).toEqual([]);
});

test('Dashboard shows content even with empty data', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@revolis.ai');
  await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'Oa175072');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  // KPI cards should render (even with 0 values)
  await expect(page.locator('text=Prehľad biznisu')).toBeVisible({ timeout: 10000 });
});

test('Dashboard redirects to login when not authenticated', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/login/, { timeout: 10000 });
});

test('Billing page loads without crash', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@revolis.ai');
  await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'Oa175072');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  await page.goto('/billing');
  await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.waitForTimeout(2000);

  expect(errors).toEqual([]);
});

test('Settings page loads without crash', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@revolis.ai');
  await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'Oa175072');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  await page.goto('/settings');
  await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.waitForTimeout(2000);

  expect(errors).toEqual([]);
});
