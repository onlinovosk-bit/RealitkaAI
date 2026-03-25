import { test, expect } from '@playwright/test';

// 1. Prihlásenie a odhlásenie používateľa
// 2. Registrácia nového používateľa
// 3. Pridanie leadu a jeho zobrazenie
// 4. Zobrazenie najlepších leadov
// 5. Overenie QA sekcie (dostupnosť, základné prvky)
// 6. Overenie odoslania onboarding emailu po registrácii
// 7. Ochrana dashboardu pred neprihláseným používateľom

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

function randomEmail(prefix: string) {
  return `${prefix}_${Math.random().toString(36).substring(2, 8)}@example.com`;
}

// test.describe('Smoke test suite', () => {
test('User registration, login, logout, and dashboard protection', async ({ page }) => {
  const email = randomEmail('smoke');
  const password = 'TestPassword123!';

  // Registration
  await page.goto(`${BASE_URL}/register`);
  await page.fill('input[name="fullName"]', `Smoke Test User`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="phone"]', '0900123456');
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
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

  // Dashboard protection
  await page.goto(`${BASE_URL}/dashboard`);
  await expect(page).toHaveURL(/login/);
});

test('Add lead and verify in dashboard', async ({ page }) => {
  // Login as demo user
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', 'demo');
  await page.fill('input[name="password"]', 'demo');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');

  await page.getByText('Pridať lead').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.fill('input[name="name"]', 'Smoke Lead');
  await page.fill('input[name="email"]', randomEmail('lead'));
  await page.click('button:has-text("Uložiť")');
  await expect(page.getByText('Smoke Lead')).toBeVisible();
});

test('Show best leads this week', async ({ page }) => {
  await page.goto(`${BASE_URL}/dashboard`);
  await expect(page.getByText('Zobraziť leady →')).toBeVisible();
  await page.getByText('Zobraziť leady →').click();
  await expect(page.getByText('klientov')).toBeVisible();
});

test('QA section is available and contains key elements', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', 'demo');
  await page.fill('input[name="password"]', 'demo');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  await page.goto(`${BASE_URL}/dashboard/qa`);
  await expect(page).not.toHaveURL(/404/);
  await expect(page).toHaveTitle(/QA|Kontrola kvality|Testovacia fáza/i);
  await expect(page.locator('text=QA / Testovacia fáza')).toBeVisible();
  await expect(page.locator('text=Kontrola kritických procesov')).toBeVisible();
});
// });
