import { test as base } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

const setup = base.extend({
  page: async ({ baseURL, page }, use) => {
    await page.route(
      (url) => {
        if (url.pathname === '/login') {
          const redirectParam = url.searchParams.get('redirect_uri');
          try {
            const redirectURL = new URL(String(redirectParam));
            const _baseURL = new URL(String(baseURL));
            return redirectURL.host !== _baseURL.host;
          } catch (error) {
            return false;
          }
        }
        return false;
      },
      async (route, request) => {
        if (request.method() !== 'POST') {
          return route.continue();
        }
        const resp = await route.fetch({ maxRedirects: 0 });
        const headers = resp.headers();
        const location = headers['location'];
        const locationURL = new URL(location!);
        return route.fulfill({
          status: 302,
          headers: {
            ...resp.headers(),
            location: `${baseURL}${locationURL.pathname}${locationURL.search}`,
          },
        });
      }
    );
    await use(page);
  },
});

setup('Login', async ({ page }) => {
  // Redirects to login page.
  await page.goto('/');
  // Wait for login page
  await page.waitForURL(
    /\/login\?client_id=[^&]+&response_type=code&redirect_uri=[^&]+&state=\//
  );
  await page
    .getByRole('textbox', { name: 'name@host.com' })
    .fill(String(process.env['APP_USERNAME']));
  await page
    .getByRole('textbox', { name: 'Password' })
    .fill(String(process.env['APP_PASSWORD']));

  const authTokenResponse = page.waitForResponse(`/auth?code=**&state=/`);
  await page.getByRole('button', { name: 'submit' }).click();

  // Wait until the page receives the cookies.
  await authTokenResponse;
  await page.waitForResponse(`/api/auth`);
  await page.waitForURL(`/accounts`);
  // End of authentication steps.
  await page.context().storageState({ path: authFile });
});
