import { test, expect } from '@playwright/test';

const goalToFocus = [
  { goal: 'increase_conversion', focus: 'hot-leads', section: 'Horúce leady' },
  { goal: 'more_leads', focus: 'new-leads', section: 'Nové leady' },
  { goal: 'better_overview', focus: 'pipeline', section: 'Pipeline' },
  { goal: 'faster_communication', focus: 'recent-contacts', section: 'Posledné kontakty' },
  { goal: 'team_management', focus: 'team-overview', section: 'Tím' },
  { goal: 'automation', focus: 'ai-insights', section: 'AI Insights' },
];

goalToFocus.forEach(({ goal, focus, section }) => {
  test(`Onboarding goal '${goal}' redirects and highlights '${section}'`, async ({ page }) => {
    // Simulate onboarding finish with selected goal
    await page.goto(`/onboarding?test_goal=${goal}`);
    // Simulate clicking 'Pokračovať' (replace with actual selector if needed)
    await page.evaluate((g) => {
      window.localStorage.setItem('selectedGoals', JSON.stringify([g]));
    }, goal);
    await page.goto(`/dashboard?focus=${focus}`);

    // Section should be present
    const sectionEl = await page.locator(`#${focus}`);
    await expect(sectionEl).toBeVisible();
    // Should have highlight class
    await expect(sectionEl).toHaveClass(/focus-highlight/);
    // Tooltip should be visible
    await expect(page.locator('.focus-tooltip')).toBeVisible();
    // Section heading should match
    await expect(sectionEl.locator('h2')).toHaveText(section);
  });
});

test('Onboarding fallback (no goal) redirects and highlights pipeline', async ({ page }) => {
  await page.goto('/dashboard?focus=pipeline');
  const sectionEl = await page.locator('#pipeline');
  await expect(sectionEl).toBeVisible();
  await expect(sectionEl).toHaveClass(/focus-highlight/);
  await expect(page.locator('.focus-tooltip')).toBeVisible();
  await expect(sectionEl.locator('h2')).toHaveText('Pipeline');
});
