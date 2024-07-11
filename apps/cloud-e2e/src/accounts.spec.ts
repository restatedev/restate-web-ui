import { test } from '@restate/util/playwright';

test('should redirect to accounts', async ({ page, baseURL }) => {
  await page.goto('/');
  await page.waitForURL(`${baseURL}/accounts/**`);
});
