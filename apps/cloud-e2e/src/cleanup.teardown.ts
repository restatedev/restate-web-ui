import { test as setup } from '@restate/util/playwright';

setup('clean up', async ({ page, request, baseURL }) => {
  // Redirects to login page.
  await page.goto('/');
  await page.waitForURL('/accounts/*/environments/*/settings');
  const accountId = (await page.url()).match(/\/accounts\/(?<accountId>[^\/]+)/)
    ?.groups?.accountId;

  // Delete environment
  await page.getByRole('button', { name: 'Delete environment' }).click();
  await page.getByLabel('Type "delete" to confirm').fill('delete');
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.waitForURL('/accounts/*/environments');

  // Delete account
  const storage = await page.context().storageState();
  const localStorage = storage.origins.find(
    ({ origin }) => origin === baseURL
  )?.localStorage;
  await request.delete(`/api/accounts/${accountId}`, {
    headers: {
      Authorization: `Bearer ${
        localStorage?.find(({ name }) => name === 'atk')?.value
      }`,
    },
  });
});
