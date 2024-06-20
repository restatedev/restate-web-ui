import { test } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  await page.waitForURL((url) => {
    return url.pathname.startsWith('/accounts');
  });
});
