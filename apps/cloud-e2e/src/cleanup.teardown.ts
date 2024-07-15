import { test as setup } from '@restate/util/playwright';
import { expect } from '@playwright/test';
import { Account, Environment } from '@restate/data-access/cloud/api-client';

setup('clean up', async ({ page, baseURL, targetURL }) => {
  const storage = await page.context().storageState();
  const localStorage = storage.origins.find(
    ({ origin }) => origin === baseURL
  )?.localStorage;

  const headers = {
    Authorization: `Bearer ${
      localStorage?.find(({ name }) => name === 'atk')?.value
    }`,
  };

  const response = await page.request.get(`${targetURL}/api/accounts`, {
    headers,
  });

  const { accounts }: { accounts: Account[] } = await response.json();
  const allEnvironments = await Promise.all(
    accounts.map(async ({ accountId }) => {
      const response = await page.request.get(
        `${targetURL}/api/accounts/${accountId}/environments`,
        {
          headers,
        }
      );
      const { environments }: { environments: Environment[] } =
        await response.json();
      return {
        accountId,
        environments: environments ?? [],
      };
    })
  );

  await Promise.all(
    allEnvironments.map(async ({ accountId, environments }) => {
      await Promise.all(
        environments.map(
          async ({ environmentId }) =>
            await page.request.delete(
              `${targetURL}/api/accounts/${accountId}/environments/${environmentId}`,
              {
                headers,
              }
            )
        )
      );
      return await page.request.delete(
        `${targetURL}/api/accounts/${accountId}`,
        {
          headers,
        }
      );
    })
  );
  const noAccountsResponse = await page.request.get(
    `${targetURL}/api/accounts`,
    {
      headers,
    }
  );
  const { accounts: noAccounts }: { accounts: Account[] } =
    await noAccountsResponse.json();
  await expect(noAccounts).toHaveLength(0);
});
