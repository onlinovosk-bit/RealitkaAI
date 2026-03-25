
import { test, expect } from '@playwright/test';

test('User registration, login, and logout flow', async ({ page }) => {
  // Generate unique email for each run
  const email = `testuser_${Date.now()}@example.com`;
  const password = 'TestPassword123!';

  // Registration
  await page.goto('/register');
  await page.fill('input[name="fullName"]', `Test User ${Date.now()}`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="phone"]', '0900123456');
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  // Expect redirect to login with registered param
  await page.waitForURL('**/login?registered=1');
  await expect(page).toHaveURL(/login\?registered=1/);

  // Login
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  await expect(page).toHaveURL(/dashboard/);

  // Logout
  await page.click('button:has-text("Odhlásiť sa")');
  await page.waitForURL('**/login');
  await expect(page).toHaveURL(/login/);

  // Try to access dashboard again (should redirect to login)
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/login/);
});
