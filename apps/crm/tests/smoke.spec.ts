// Kompletné smoke testy pre Realitka AI CRM
// Playwright v1.58+ syntax, žiadne describe, žiadne import/export

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

function randomEmail(prefix: string) {
    return `${prefix}_${Math.random().toString(36).substring(2, 8)}@example.com`;
}

test('Registrácia používateľa', async ({ page }) => {
    const email = randomEmail('smoke');
    await page.goto(`${BASE_URL}/register`);
    await page.fill('input[name="fullName"]', `Smoke Test User`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="phone"]', '0900123456');
    await page.fill('input[name="password"]', 'Test1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/login?registered=1');
    await expect(page).toHaveURL(/login\?registered=1/);
});

test('Prihlásenie používateľa', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'demo@realitka.ai');
    await page.fill('input[name="password"]', 'demo1234');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/dashboard/);
});

test('Odhlásenie používateľa', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'demo@realitka.ai');
    await page.fill('input[name="password"]', 'demo1234');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await page.click('button[aria-label="Odhlásiť sa"]');
    await page.waitForURL('**/login');
    await expect(page).toHaveURL(/login/);
});

test('Ochrana dashboardu (bez prihlásenia)', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/login/);
});

test('Vytvorenie leadu', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'demo@realitka.ai');
    await page.fill('input[name="password"]', 'demo1234');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await page.goto(`${BASE_URL}/leads`);
    await page.click('button:text("Nový lead")');
    await page.fill('input[name="name"]', 'Smoke Test Lead');
    await page.click('button:text("Uložiť")');
    await page.waitForSelector('text=Smoke Test Lead');
});

test('Najlepšie leady', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'demo@realitka.ai');
    await page.fill('input[name="password"]', 'demo1234');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await page.goto(`${BASE_URL}/leads/best`);
    await page.waitForSelector('text=Najlepšie leady');
});

test('QA sekcia', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'demo@realitka.ai');
    await page.fill('input[name="password"]', 'demo1234');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await page.goto(`${BASE_URL}/qa`);
    await page.waitForSelector('text=QA dostupnosť');
});

// Onboarding email test je voliteľný podľa konfigurácie
test('Onboarding email (ak je Resend API nastavené)', async ({ page }) => {
    if (!process.env.RESEND_API_KEY) {
        test.skip();
    }
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'demo@realitka.ai');
    await page.fill('input[name="password"]', 'demo1234');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await page.goto(`${BASE_URL}/onboarding`);
    await page.click('button:text("Odoslať onboarding email")');
    await page.waitForSelector('text=Email odoslaný');
});
