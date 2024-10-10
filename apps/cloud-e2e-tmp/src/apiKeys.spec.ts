import { expect, Page, test, PlaywrightWorkerOptions } from '@playwright/test';

async function createAndDeleteApiKey(
  page: Page,
  browserName: PlaywrightWorkerOptions['browserName']
) {
  await page.getByRole('button', { name: /Create API Key/ }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create' })
    .click();
  await expect(
    await page.getByLabel('Description')
  ).toHaveAccessibleDescription(/fill out this field/i);
  await expect(await page.getByRole('radiogroup')).toHaveAccessibleDescription(
    /select one of these options/i
  );

  const apiKeyDescription = `tmp-key-${Math.floor(Math.random() * 10)}`;
  await page
    .getByRole('dialog')
    .getByLabel('Description')
    .fill(apiKeyDescription);
  await page
    .getByRole('dialog')
    .getByText(/Invoke/)
    .check();
  const createApiKeyResponsePromise = page.waitForResponse(
    `/api/accounts/*/environments/*/keys?**`
  );
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create' })
    .click();
  const createApiKeyResponse = await (await createApiKeyResponsePromise).json();
  expect(
    await page.getByRole('dialog').getByText(createApiKeyResponse.apiKey)
  ).toBeAttached();
  await page.getByRole('dialog').getByRole('button', { name: 'Copy' }).click();
  if (browserName !== 'webkit') {
    expect(await page.evaluate(() => navigator.clipboard.readText())).toEqual(
      createApiKeyResponse.apiKey
    );
  }
  await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  await page
    .getByText(createApiKeyResponse.keyId)
    .waitFor({ state: 'attached' });
  expect(
    await page.getByRole('listitem').getByText(createApiKeyResponse.keyId)
  ).toBeAttached();
  expect(await page.getByRole('listitem').getByText('Invoke')).toBeAttached();
  await page.getByRole('listitem').getByRole('button').click();
  await page
    .getByRole('dialog')
    .getByRole('heading', { name: 'Confirm API key deletion' });
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
  const deleteResponse = page.waitForResponse(
    `/api/accounts/*/environments/*/keys/${createApiKeyResponse.keyId}`
  );
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete' })
    .click();
  await deleteResponse;
  await page
    .getByText(createApiKeyResponse.keyId)
    .waitFor({ state: 'detached' });
  expect(await page.getByText(createApiKeyResponse.keyId)).not.toBeAttached();
}

test('should create and delete an api key', async ({
  page,
  baseURL,
  browserName,
}) => {
  await page.goto('/');
  await page.waitForURL(`${baseURL}/accounts/**`);

  // Create and delete API keys
  await createAndDeleteApiKey(page, browserName);
  await createAndDeleteApiKey(page, browserName);
});
