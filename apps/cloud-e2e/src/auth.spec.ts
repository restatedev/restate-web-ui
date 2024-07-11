import { test } from '@restate/util/playwright';

test.describe('Not authenticated', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('Should redirect to login page', async ({ page, baseURL }) => {
    await page.goto('/');
    await page.waitForURL(`**/login**&redirect_uri=${baseURL}/auth`);
  });
});
