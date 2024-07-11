import { test as setup } from '@restate/util/playwright';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ baseURL, page }) => {
  // Redirects to login page.
  await page.goto('/');
  await page.waitForURL(`**/login**&redirect_uri=${baseURL}/auth`);
  await page
    .getByRole('textbox', { name: 'name@host.com' })
    .fill(String(process.env['APP_USERNAME']));
  await page
    .getByRole('textbox', { name: 'Password' })
    .fill(String(process.env['APP_PASSWORD']));
  await page.getByRole('button', { name: 'submit' }).click();

  // Wait until the page receives the cookies.
  //
  // Sometimes login flow sets cookies in the process of several redirects.
  // Wait for the final URL to ensure that the cookies are actually set.
  await page.waitForURL(`${baseURL}/auth?code=**`);
  await page.waitForURL(`${baseURL}/accounts`);

  // End of authentication steps.
  await page.context().storageState({ path: authFile });
});
