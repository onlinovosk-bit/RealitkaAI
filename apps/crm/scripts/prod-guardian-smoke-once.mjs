/**
 * One-shot PROD Guardian smoke (Smolko vertical-pack).
 * Requires TEST_USER_EMAIL + TEST_USER_PASSWORD in .env.local (Smolko owner).
 * Does NOT mutate data — read + one navigation click only.
 */
import { config } from "dotenv";
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

config({ path: ".env.local" });

const BASE = "https://app.revolis.ai";
const email = process.env.TEST_USER_EMAIL ?? process.env.NEXT_PUBLIC_TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD ?? process.env.NEXT_PUBLIC_TEST_USER_PASSWORD;

const report = {
  at: new Date().toISOString(),
  base: BASE,
  loginEmail: email ? `${email.slice(0, 3)}***` : null,
  checks: {},
  errors: [],
};

async function main() {
  if (!email || !password) {
    report.errors.push("Missing TEST_USER_EMAIL/PASSWORD in .env.local");
    finish(1);
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 45_000 });

    report.checks.login = { ok: true, url: page.url() };

    await page.goto(`${BASE}/vertical-pack/13303557`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    const fixtureBanner = await page.getByText("DB riadok nenájdený").count();
    report.checks.bod1_fixture = { present: fixtureBanner > 0 };

    const panel = page.getByTestId("guardian-panel");
    report.checks.bod1_panel = { visible: await panel.isVisible().catch(() => false) };

    const panelText = (await panel.textContent().catch(() => "")) ?? "";
    const pctMatch = panelText.match(/(\d+)\s*%/);
    report.checks.bod1_completeness = {
      percent: pctMatch ? Number(pctMatch[1]) : null,
      rawSnippet: panelText.slice(0, 120),
    };

    const todos = await page.locator('[data-testid^="guardian-todo-"]').count();
    report.checks.bod2_todos = { count: todos };

    const editLink = page.getByTestId("guardian-action-edit");
    const editUnavailable = page.getByTestId("guardian-action-edit-unavailable");
    const hasEdit = (await editLink.count()) > 0;
    const hasUnavailable = (await editUnavailable.count()) > 0;
    report.checks.bod4_edit_cta = { activeLink: hasEdit, disabledUnavailable: hasUnavailable };

    if (hasEdit) {
      await editLink.click();
      await page.waitForURL(/\/properties/, { timeout: 30_000 });
      report.checks.bod4_url = { href: page.url(), hasSourceId: page.url().includes("source_id=13303557") };
      const slideOver = page.getByTestId("property-edit-slide-over");
      report.checks.bod4_slideover = {
        visible: await slideOver.isVisible().catch(() => false),
      };
    }

    const publishFollowup = page.getByTestId("guardian-publish-followup");
    const publishBtn = page.getByTestId("guardian-publish-button");
    report.checks.bod5_publish = {
      followup: (await publishFollowup.count()) > 0,
      button: (await publishBtn.count()) > 0,
      buttonDisabled: publishBtn.count() > 0 ? await publishBtn.isDisabled().catch(() => null) : null,
    };
  } catch (err) {
    report.errors.push(err instanceof Error ? err.message : String(err));
  } finally {
    await browser.close();
  }

  finish(report.errors.length ? 2 : 0);
}

function finish(code) {
  const outPath = new URL("../../docs/audit/prod-guardian-smoke-latest.json", import.meta.url);
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(code);
}

main();
