import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.route('*/**/health', async (route) => {
    await route.fulfill({ status: 200 });
  });
  await page.route('*/**/version', async (route) => {
    await route.fulfill({ status: 200 });
  });
  await page.route('*/**/deployments', async (route) => {
    await route.fulfill({ json: { deployments: [] } });
  });
  const listDeployment = page.waitForResponse(`**/deployments`);
  await page.goto('/ui/');

  await listDeployment;
  // Expect h3 to contain a substring.
  expect((await page.locator('h3').innerText()).replace(/\n/g, '')).toContain(
    'No service deployments',
  );
});
