import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect } from '@playwright/test';
import mockResponses from './fixtures/call-transcripts/mock-claude-responses.json';

const FIXTURE_DIR = resolve(__dirname, 'fixtures/call-transcripts');
const obhliadkaTranscript = readFileSync(resolve(FIXTURE_DIR, 'obhliadka.sk.txt'), 'utf8');

test.describe('Call Analyzer E2E (Claude mock)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/ai/call/analyze', async (route) => {
      const body = route.request().postDataJSON() as { transcript?: string };
      const isPriceObjection = (body.transcript ?? '').includes('389-tisíc');
      const payload = isPriceObjection ? mockResponses.cenova_namietka : mockResponses.obhliadka;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, ...payload }),
      });
    });
  });

  test('prepis → analýza zobrazí sentiment a súhrn', async ({ page }) => {
    await page.goto('/call-analyzer');
    await expect(page.getByRole('heading', { name: /Analyzátor hovorov/i })).toBeVisible();
    await page.getByPlaceholder('Vlož prepis hovoru...').fill(obhliadkaTranscript);
    await page.getByRole('button', { name: 'Analyzovať' }).click();
    await expect(page.getByText('Sentiment:').locator('..')).toContainText('positive', { timeout: 15_000 });
    await expect(page.getByText(/obhliadku|rezerváciu|manželkou/i)).toBeVisible();
    await expect(page.getByText(/Ďalší krok:/)).toBeVisible();
  });

  test('cenová námietka fixture vráti objections v API mock ceste', async ({ page }) => {
    const cenova = readFileSync(resolve(FIXTURE_DIR, 'cenova-namietka.sk.txt'), 'utf8');
    await page.goto('/call-analyzer');
    await page.getByPlaceholder('Vlož prepis hovoru...').fill(cenova);
    await page.getByRole('button', { name: 'Analyzovať' }).click();
    await expect(page.getByText('Sentiment:').locator('..')).toContainText('neutral', { timeout: 15_000 });
    await expect(page.getByText(/360|vlastníka|zľavu/i)).toBeVisible();
  });
});
