import { test as setup, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Musí sedieť s `authFile` v playwright.config.ts (tests/playwright/.auth)
const authDir = path.join(__dirname, 'playwright/.auth');
const storageState = path.join(authDir, 'user.json');

setup('authenticate', async ({ page }: { page: Page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  // Fail fast ak chýbajú ENV premenné
  if (!email || !password) {
    throw new Error('❌ TEST_USER_EMAIL alebo TEST_USER_PASSWORD nie sú definované v ENV.');
  }

  // 1. Zabezpečenie existencie priečinka (prevencia chyby zápisu)
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  console.log('🚀 Navigujem na /login...');
  // `networkidle` je na dev serveri často nestabilné (HMR/SSE); `load` stačí na mount formulára.
  await page.goto('/login', { waitUntil: 'load', timeout: 60_000 });

  // DEBUG: Ak to zlyhá, urobíme screenshot hneď pri štarte
  await page.screenshot({ path: 'tests/debug/login-start.png' });

  // 2. Zachytávanie konzolových chýb z prehliadača (uvidíme chyby zo Supabase)
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`❌ BROWSER ERROR: "${msg.text()}"`);
  });

  const emailInput = page.locator('input[name="email"]');
  const passwordInput = page.locator('input[name="password"]');
  const submitButton = page.locator('button[type="submit"]');

  console.log('⏳ Čakám na pripravenosť formulára...');
  await emailInput.waitFor({ state: 'visible', timeout: 30_000 });
  await emailInput.fill(email);
  await passwordInput.fill(password);
  await submitButton.click();

  // Overenie úspechu ALEBO zachytenie chyby pre lepší debug
  try {
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  } catch (error) {
    const errorMessage = await page.locator('text=Invalid login credentials').isVisible();
    if (errorMessage) {
      throw new Error('❌ Prihlásenie zlyhalo: Supabase odmietol údaje. Skontroluj používateľa v DB.');
    }
    throw error;
  }

  await page.context().storageState({ path: storageState });
  console.log('✅ Auth setup hotový. Session uložená.');
});