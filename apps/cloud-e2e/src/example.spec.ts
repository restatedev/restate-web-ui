import { test } from '@restate/util/playwright';
import { expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Welcome to Cloud!' })
  ).toBeVisible();
});
