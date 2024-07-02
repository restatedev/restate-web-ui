import { test as base } from '@playwright/test';
const deploymentURL = process.env['DEPLOYMENT_URL'];

export const test = base.extend({
  page: async ({ baseURL, page }, use) => {
    if (deploymentURL) {
      await page.route(`${baseURL}/**/*`, async (route, request) => {
        const requestUrl = new URL(request.url());
        const deploymentUrl = new URL(deploymentURL);
        requestUrl.host = deploymentUrl.host;
        requestUrl.protocol = deploymentUrl.protocol;
        requestUrl.port = deploymentUrl.port;

        const { host, ...headers } = await request.allHeaders();
        const response = await route.fetch({
          url: requestUrl.href,
          headers,
        });

        return await route.fulfill({ response });
      });
    }
    await use(page);
  },
});
