/**
 * E2E: AI Call Analyzer — mock Whisper (bez OpenAI volania), analýza cez reálny /api/ai/call/analyze.
 * Voliteľný test so skutočným Whisper: E2E_REAL_WHISPER=1 a OPENAI_API_KEY (nákladové).
 *
 * Playwright spúšťa dev server s E2E_BYPASS_AUTH=1 (pozri playwright.config) — obíde Supabase login.
 * Pri reuseExistingServer spusti lokálne: `set E2E_BYPASS_AUTH=1` pred `npm run dev`.
 */
import { test, expect, type Page } from "@playwright/test";

async function gotoCallAnalyzerOrSkip(page: Page) {
  await page.goto("/call-analyzer", { waitUntil: "load", timeout: 60_000 });
  if (/\/login/i.test(page.url())) {
    test.skip(
      true,
      "Dev server beží bez E2E_BYPASS_AUTH=1. Spusti Playwright bez reuse (zatvor dev), alebo: set E2E_BYPASS_AUTH=1 && npm run dev."
    );
  }
}

/** Minimálny platný WAV (prázdne dáta), len na upload v UI. */
const TINY_WAV = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74,
  0x20, 0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x40, 0x1f, 0x00, 0x00, 0x80, 0x3e,
  0x00, 0x00, 0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00, 0x00,
]);

test.describe("Call Analyzer (mock Whisper)", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await page.route("**/api/ai/call/transcribe", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          text: "Ďakujem za záujem. Cena je v poriadku. Chcem stretnutie na obhliadku budúci týždeň.",
        }),
      });
    });
  });

  test("Transkribovať + analyzovať zobrazí Call Score", async ({ page }) => {
    await gotoCallAnalyzerOrSkip(page);
    await page.getByTestId("call-analyzer-audio-file").setInputFiles({
      name: "fixture.wav",
      mimeType: "audio/wav",
      buffer: TINY_WAV,
    });
    await page.getByTestId("call-analyzer-transcribe-analyze").click();
    await expect(page.getByTestId("call-analyzer-result")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(/Call Score/i)).toBeVisible();
  });

  test("Analyzovať prepis bez audio", async ({ page }) => {
    await page.goto("/call-analyzer", { waitUntil: "load", timeout: 60_000 });
    await page.getByTestId("call-analyzer-transcript").fill(
      "Ďakujem pekne. Cena je v poriadku. Dohodnime si stretnutie na obhliadku zajtra o tretej."
    );
    await page.getByTestId("call-analyzer-analyze").click();
    await expect(page.getByTestId("call-analyzer-result")).toBeVisible({ timeout: 30_000 });
  });
});

test.describe("Call Analyzer (voliteľný skutočný Whisper)", () => {
  test.describe.configure({ timeout: 180_000 });

  test("nahratie + transkripcia cez OpenAI", async ({ page }) => {
    if (process.env.E2E_REAL_WHISPER !== "1" || !process.env.OPENAI_API_KEY) {
      test.skip();
    }

    await gotoCallAnalyzerOrSkip(page);
    await page.getByTestId("call-analyzer-audio-file").setInputFiles({
      name: "fixture.wav",
      mimeType: "audio/wav",
      buffer: TINY_WAV,
    });
    await page.getByTestId("call-analyzer-transcribe-analyze").click();
    await expect(page.getByTestId("call-analyzer-result")).toBeVisible({ timeout: 120_000 });
  });
});
