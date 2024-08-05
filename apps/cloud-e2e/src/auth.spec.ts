import { test } from '@playwright/test';

test.describe('Not authenticated', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('Should redirect to login page', async ({ page }) => {
    await page.goto('/');
    // Wait for login page
    await page.waitForURL(
      /\/login\?client_id=[^&]+&response_type=code&redirect_uri=[^&]+cloud\.restate\.dev\/auth&state=\//
    );
  });
});
