import { test, expect } from '@playwright/test';

test('TC-008 Najlepšie leady tento týždeň', async ({ page }) => {
  // Otvor dashboard
  await page.goto('https://www.revolis.ai/dashboard');

  // Počkaj, kým sa zobrazí tlačidlo
  await expect(page.getByText('Zobraziť leady →')).toBeVisible();

  // Klikni na tlačidlo
  await page.getByText('Zobraziť leady →').click();

  // Over, že sa zobrazí text 'klientov'
  await expect(page.getByText('klientov')).toBeVisible();
});
