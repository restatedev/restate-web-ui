import { test as base } from '@playwright/test';
const deploymentURL = process.env['DEPLOYMENT_URL'];

export const test = base.extend({
  page: async ({ baseURL, page }, use) => {
    if (deploymentURL) {
      await page.route('**', async (route, request) => {
        const requestUrl = new URL(request.url());
        const deploymentUrl = new URL(deploymentURL);

        const headers = await request.allHeaders();
        if (requestUrl.host === new URL(baseURL!).host) {
          requestUrl.host = deploymentUrl.host;
          requestUrl.protocol = deploymentUrl.protocol;
          requestUrl.port = deploymentUrl.port;
          delete headers['host'];
        }

        try {
          const response = await route.fetch({
            maxRedirects: 0,
            url: requestUrl.href,
            headers,
          });
          const redirectUrl = response.headers()['location'];
          if (redirectUrl && response.status() === 302) {
            return await page.goto(redirectUrl);
          }

          return await route.fulfill({ response });
        } catch (error) {
          return await route.continue();
        }
      });
    }
    await use(page);
  },
});
