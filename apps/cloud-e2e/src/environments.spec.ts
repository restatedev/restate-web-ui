import { expect, test } from '@playwright/test';

test('should create and delete an account', async ({ page, baseURL }) => {
  await page.goto('/');
  await page.waitForURL(`${baseURL}/accounts/**`);

  // Create environment
  await page.getByRole('button', { name: /e2e-env/ }).click();
  await page.getByRole('menuitem', { name: /Create environment/ }).click();
  const envName = `tmp-env-${Math.floor(Math.random() * 10)}`;
  await page.getByRole('dialog').getByLabel('Name').fill(envName);
  const createEnvResponsePromise = page.waitForResponse(/.*CreateEnvironment$/);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create' })
    .click();
  const createEnvResponse = await (await createEnvResponsePromise).json();
  const newEnvId = createEnvResponse.environmentId;
  await page.waitForResponse(`/api/accounts/*/environments/${newEnvId}`);
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  await page.waitForURL(`/accounts/*/environments/${newEnvId}/settings`);
  expect(
    await page.getByRole('button', { name: new RegExp(envName) })
  ).toBeVisible();

  // Check the environment is finished setting up
  await page.getByText(
    /Your Restate environment is being created and will be ready shortly\./
  );
  await page
    .getByText(
      /Your Restate environment is being created and will be ready shortly\./
    )
    .waitFor({ state: 'detached', timeout: 60 * 1000 });
  expect(await page.getByRole('status', { name: 'HEALTHY' })).toBeVisible();

  // Delete the environment
  await page.getByRole('button', { name: /Delete environment/ }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(
    await page.getByLabel('Type "delete" to confirm')
  ).toHaveAccessibleDescription(/fill out this field/i);
  await page
    .getByRole('textbox', { name: 'Type "delete" to confirm' })
    .fill('delete');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete' })
    .click();
  await page.waitForResponse(/.*DestroyEnvironment$/);
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  await page
    .getByRole('button', { name: /e2e-env/ })
    .waitFor({ state: 'visible' });
});
