# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.setup.ts >> authenticate
- Location: tests\auth.setup.ts:8:6

# Error details

```
Error: ❌ TEST_USER_EMAIL alebo TEST_USER_PASSWORD nie sú definované v ENV.
```

# Test source

```ts
  1  | import { test as setup, expect, Page } from '@playwright/test';
  2  | import path from 'path';
  3  | import fs from 'fs';
  4  | 
  5  | const authDir = path.join(__dirname, '../playwright/.auth');
  6  | const storageState = path.join(authDir, 'user.json');
  7  | 
  8  | setup('authenticate', async ({ page }: { page: Page }) => {
  9  |   const email = process.env.TEST_USER_EMAIL;
  10 |   const password = process.env.TEST_USER_PASSWORD;
  11 | 
  12 |   // Fail fast ak chýbajú ENV premenné
  13 |   if (!email || !password) {
> 14 |     throw new Error('❌ TEST_USER_EMAIL alebo TEST_USER_PASSWORD nie sú definované v ENV.');
     |           ^ Error: ❌ TEST_USER_EMAIL alebo TEST_USER_PASSWORD nie sú definované v ENV.
  15 |   }
  16 | 
  17 |   // 1. Zabezpečenie existencie priečinka (prevencia chyby zápisu)
  18 |   if (!fs.existsSync(authDir)) {
  19 |     fs.mkdirSync(authDir, { recursive: true });
  20 |   }
  21 | 
  22 |   console.log('🚀 Navigujem na /login...');
  23 |   await page.goto('/login', { waitUntil: 'networkidle' });
  24 | 
  25 |   // DEBUG: Ak to zlyhá, urobíme screenshot hneď pri štarte
  26 |   await page.screenshot({ path: 'tests/debug/login-start.png' });
  27 | 
  28 |   // 2. Zachytávanie konzolových chýb z prehliadača (uvidíme chyby zo Supabase)
  29 |   page.on('console', msg => {
  30 |     if (msg.type() === 'error') console.log(`❌ BROWSER ERROR: "${msg.text()}"`);
  31 |   });
  32 | 
  33 |   const emailInput = page.locator('input[name="email"]');
  34 |   const passwordInput = page.locator('input[name="password"]');
  35 |   const submitButton = page.locator('button[type="submit"]');
  36 | 
  37 |   console.log('⏳ Čakám na pripravenosť formulára...');
  38 |   await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  39 |   await emailInput.fill(email);
  40 |   await passwordInput.fill(password);
  41 |   await submitButton.click();
  42 | 
  43 |   // Overenie úspechu ALEBO zachytenie chyby pre lepší debug
  44 |   try {
  45 |     await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  46 |   } catch (error) {
  47 |     const errorMessage = await page.locator('text=Invalid login credentials').isVisible();
  48 |     if (errorMessage) {
  49 |       throw new Error('❌ Prihlásenie zlyhalo: Supabase odmietol údaje. Skontroluj používateľa v DB.');
  50 |     }
  51 |     throw error;
  52 |   }
  53 | 
  54 |   await page.context().storageState({ path: storageState });
  55 |   console.log('✅ Auth setup hotový. Session uložená.');
  56 | });
```