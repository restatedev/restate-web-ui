import { test as setup } from '@playwright/test';
import { expect } from '@playwright/test';
setup.setTimeout(120000);
setup('onboarding', async ({ page }) => {
  await page.goto('/');
  await page.waitForURL('/accounts');

  // Account creation validation
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(await page.getByLabel('Name')).toHaveAccessibleDescription(
    'Please fill out this field.'
  );
  await expect(
    await page.getByLabel('I have read and agree to the Terms & Conditions')
  ).toHaveAccessibleDescription(
    'Please check this box if you want to proceed.'
  );

  // Create account
  await page
    .getByLabel('I have read and agree to the Terms & Conditions')
    .check();
  await page.getByLabel('Name').fill('e2e-account');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.waitForURL('/accounts/**');

  // Environment creation validation
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(await page.getByLabel('Name')).toHaveAccessibleDescription(
    'Please fill out this field.'
  );

  // Create environment
  await page.getByLabel('Name').fill('e2e-env');
  await page.getByRole('button', { name: 'Create' }).click();
  await page.waitForURL('/accounts/*/environments/*/settings');
  await page
    .getByRole('status', { name: 'HEALTHY' })
    .waitFor({ state: 'attached', timeout: 2 * 60 * 1000 });
});
