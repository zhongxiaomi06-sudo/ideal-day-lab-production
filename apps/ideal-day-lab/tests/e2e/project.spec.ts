import { expect, test } from '@playwright/test';
import { expectHealthyEntrance, setDeterministicLocale, watchPageFailures } from '../../../../tests/e2e/support';

test.beforeEach(async ({ page }) => setDeterministicLocale(page, ['ideal-day-lab.locale']));

test('starts a day from the current intro', async ({ page }) => {
  const failures = watchPageFailures(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Slide into your ideal day' })).toBeVisible();
  await expect(page.locator('.clock-art .hub')).toHaveText('24H');
  await expect(page.getByRole('button', { name: 'Turn sound off' })).toBeVisible();
  await page.getByRole('button', { name: 'Start my day' }).click();
  await expect(page.getByRole('heading', { name: 'Fine-tune every block' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/[\u3400-\u9fff]/);
  await expect(page.locator('.nav-pill')).toBeInViewport();
  await expectHealthyEntrance(page, failures);
});
