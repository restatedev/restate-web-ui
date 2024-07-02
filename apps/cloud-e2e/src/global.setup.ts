import { test as setup } from '@playwright/test';
const appEnv = process.env['APP_ENV'] || 'mock';
const BASE_URL: Record<string, string> = {
  dev: 'https://dev.cloud.restate.dev',
  prod: 'https://cloud.restate.dev',
  mock: 'http://localhost:4200',
};
export const baseURL = BASE_URL[appEnv];
export const deploymentURL =
  process.env['DEPLOYMENT_URL'] || 'http://localhost:4200';

setup('create new database', async ({ page, context }) => {
  console.log('!!!!!!!', baseURL);
  expect(1).toBe(2);
  await page.route(`${baseURL}/**/*`, async (route, request) => {
    console.log(route, deploymentURL, request);
    await page.pause();
    if (baseURL && request.url().startsWith(baseURL)) {
      await route.continue({ url: deploymentURL });
    } else {
      await route.continue();
    }
  });
});
