import { test } from '@restate/util/playwright';

test('has title', async ({ page, baseURL }) => {
  await page.goto('/');
  await page.waitForURL(`**/login**&redirect_uri=${baseURL}/auth`);
});
