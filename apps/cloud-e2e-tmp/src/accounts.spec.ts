import { test } from '@playwright/test';

test('should redirect to account if there is an account', async ({
  page,
  baseURL,
}) => {
  await page.goto('/');
  await page.waitForURL(`${baseURL}/accounts/**`);
});
