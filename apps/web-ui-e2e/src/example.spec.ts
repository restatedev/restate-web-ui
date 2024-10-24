import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  const listDeployment = page.waitForResponse(`**/deployments`);
  await page.goto('/');
  await listDeployment;
  // Expect h3 to contain a substring.
  expect((await page.locator('h3').innerText()).replace(/\n/g, '')).toContain(
    'No service deployments'
  );
});
