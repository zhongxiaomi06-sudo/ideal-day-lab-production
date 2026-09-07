import { expect, type Page } from '@playwright/test';

export type PageFailureLog = {
  pageErrors: string[];
  consoleErrors: string[];
  failedResources: string[];
};

export async function setDeterministicLocale(page: Page, storageKeys: string[] = ['eazo.locale']) {
  await page.addInitScript(({ keys }) => {
    for (const key of keys) localStorage.setItem(key, 'en-US');
  }, { keys: storageKeys });
}

export function watchPageFailures(page: Page): PageFailureLog {
  const log: PageFailureLog = { pageErrors: [], consoleErrors: [], failedResources: [] };
  page.on('pageerror', (error) => log.pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') log.consoleErrors.push(message.text());
  });
  page.on('response', (response) => {
    const responseUrl = new URL(response.url());
    if (responseUrl.hostname === '127.0.0.1' && response.status() >= 400) {
      log.failedResources.push(`${response.status()} ${responseUrl.pathname}`);
    }
  });
  return log;
}

export async function expectHealthyEntrance(page: Page, failures: PageFailureLog) {
  await expect.poll(async () => page.evaluate(() => (document.body.textContent?.trim().length ?? 0) > 0)).toBe(true);
  await expect.poll(async () => page.evaluate(() => document.documentElement.lang || 'en-US')).toMatch(/^en/i);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'document-level horizontal overflow').toBeLessThanOrEqual(1);

  const unresolved = await page.locator('[data-i18n]').evaluateAll((nodes) => nodes
    .filter((node) => node.textContent?.trim() === node.getAttribute('data-i18n'))
    .map((node) => node.getAttribute('data-i18n')));
  expect(unresolved, 'unresolved translation keys').toEqual([]);
  expect(failures.pageErrors, 'uncaught page errors').toEqual([]);
  expect(failures.consoleErrors, 'console errors').toEqual([]);
  expect(failures.failedResources, 'same-origin HTTP failures').toEqual([]);
}
