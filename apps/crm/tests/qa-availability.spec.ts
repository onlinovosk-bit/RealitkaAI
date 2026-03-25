import { test, expect } from '@playwright/test';

// Automatizovaný test na kontrolu dostupnosti QA sekcie po deployi

test.describe('QA sekcia - dostupnosť', () => {
  test('Stránka /dashboard/qa je dostupná a obsahuje základné prvky', async ({ page }) => {
    // Prihlásenie cez login formulár
    await page.goto('https://www.revolis.ai/login');
    await page.fill('input[name="email"]', 'demo');
    await page.fill('input[name="password"]', 'demo');
    await page.click('button[type="submit"]');
    // Počkajte na presmerovanie do dashboardu
    await page.waitForURL('**/dashboard');

    // Prejdite na QA sekciu
    await page.goto('https://www.revolis.ai/dashboard/qa');

    // Očakávame, že stránka sa načíta bez 404
    await expect(page).not.toHaveURL(/404/);
    await expect(page).toHaveTitle(/QA|Kontrola kvality|Testovacia fáza/i);

    // Očakávame, že sa zobrazí aspoň jeden základný prvok QA sekcie
    await expect(page.locator('text=QA / Testovacia fáza')).toBeVisible();
    await expect(page.locator('text=Automatické testy')).toBeVisible();
    await expect(page.locator('text=Kontrola kritických procesov')).toBeVisible();
  });
});
