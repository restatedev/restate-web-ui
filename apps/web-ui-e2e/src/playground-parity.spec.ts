import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test as base, type Page } from '@playwright/test';

const INGRESS = 'http://127.0.0.1:58080';
const OPENAPI_FIXTURE = join(
  import.meta.dirname,
  '../../../libs/util/openapi/src/fixtures/1.8.1-ts-Orders.json',
);
const SERVICE_FIXTURE = join(
  import.meta.dirname,
  'fixtures/service-Orders.json',
);

const test = base.extend<{ elementsPage: Page; playgroundPage: Page }>({
  elementsPage: async ({ browser }, provide) => {
    const page = await browser.newPage();
    await provide(page);
    await page.close();
  },
  playgroundPage: async ({ browser }, provide) => {
    const page = await browser.newPage();
    await provide(page);
    await page.close();
  },
});

interface CapturedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
}

async function mockServer(page: Page, isNewPlayground: boolean) {
  const captured: CapturedRequest[] = [];
  await page.addInitScript((enabled) => {
    localStorage.setItem('FEATURE_NEW_PLAYGROUND', String(enabled));
  }, isNewPlayground);
  await page.route('**/health', (route) => route.fulfill({ status: 200 }));
  await page.route('**/version', (route) =>
    route.fulfill({
      json: {
        version: '1.8.1',
        min_admin_api_version: 2,
        max_admin_api_version: 5,
        ingress_endpoint: `${INGRESS}/`,
        features: {},
      },
    }),
  );
  await page.route('**/services/Orders', (route) =>
    route.fulfill({ json: JSON.parse(readFileSync(SERVICE_FIXTURE, 'utf8')) }),
  );
  await page.route('**/services/Orders/openapi', (route) =>
    route.fulfill({ json: JSON.parse(readFileSync(OPENAPI_FIXTURE, 'utf8')) }),
  );
  await page.route(`${INGRESS}/**`, async (route) => {
    const request = route.request();
    const origin = request.headers()['origin'] ?? '*';
    const cors = {
      'access-control-allow-origin': origin,
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers':
        '*, authorization, content-type, idempotency-key',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
    };
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    captured.push({
      method: request.method(),
      url: request.url(),
      headers: await request.allHeaders(),
      body: request.postData(),
    });
    await route.fulfill({
      status: 200,
      headers: { ...cors, 'content-type': 'application/json' },
      body: '{}',
    });
  });
  return captured;
}

async function sendWithElements(page: Page, operationId: string) {
  const captured = await mockServer(page, false);
  await page.goto(
    `/ui/overview?servicePlayground=Orders#/operations/${operationId}`,
    { waitUntil: 'domcontentloaded' },
  );
  await page.getByRole('button', { name: 'Send API Request' }).click();
  await expect.poll(() => captured.length).toBe(1);
  return captured[0] as CapturedRequest;
}

async function sendWithPlayground(page: Page, handler: string, mode: string) {
  const captured = await mockServer(page, true);
  await page.goto(
    `/ui/overview?servicePlayground=Orders&playgroundHandler=${handler}`,
    { waitUntil: 'domcontentloaded' },
  );
  const dialog = page.getByRole('dialog');
  const submit = dialog.locator('form button[type=submit]');
  await expect(submit).toBeVisible({ timeout: 30_000 });
  const label = (await submit.textContent())?.trim();
  if (label !== (mode === 'send' ? 'Send' : 'Call')) {
    await dialog.getByRole('button', { name: 'Actions' }).click();
    await page
      .getByRole('menuitem', { name: mode === 'send' ? /^Send/ : /^Call/ })
      .click();
  }
  await submit.click();
  await expect.poll(() => captured.length).toBe(1);
  return captured[0] as CapturedRequest;
}

function summarize(request: CapturedRequest) {
  let bodyKeys: string[] | string | null = null;
  if (request.body) {
    try {
      const parsed = JSON.parse(request.body);
      bodyKeys =
        parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? Object.keys(parsed).sort()
          : typeof parsed;
    } catch {
      bodyKeys = 'text';
    }
  }
  return {
    method: request.method,
    url: request.url,
    contentType: request.headers['content-type'] ?? null,
    hasBody: Boolean(request.body),
    bodyKeys,
  };
}

const CASES = [
  { handler: 'create', mode: 'call', operationId: 'create' },
  { handler: 'create', mode: 'send', operationId: 'createSend' },
  { handler: 'ping', mode: 'call', operationId: 'ping' },
  { handler: 'classify', mode: 'call', operationId: 'classify' },
];

test.describe('playground parity with Stoplight Elements', () => {
  test.describe.configure({ timeout: 120_000 });

  for (const { handler, mode, operationId } of CASES) {
    test(`${handler} (${mode}) sends the same request`, async ({
      elementsPage,
      playgroundPage,
    }) => {
      const fromElements = summarize(
        await sendWithElements(elementsPage, operationId),
      );
      const fromPlayground = summarize(
        await sendWithPlayground(playgroundPage, handler, mode),
      );

      expect(fromPlayground).toEqual(fromElements);
    });
  }

  test('string bodies are valid JSON (intended difference)', async ({
    elementsPage,
    playgroundPage,
  }) => {
    const fromElements = await sendWithElements(elementsPage, 'echo');
    const fromPlayground = await sendWithPlayground(
      playgroundPage,
      'echo',
      'call',
    );

    expect(fromPlayground.url).toBe(fromElements.url);
    expect(fromElements.body).toBe('string');
    expect(fromPlayground.body).toBe('"string"');
  });

  test('an empty optional text body is not sent (intended difference)', async ({
    elementsPage,
    playgroundPage,
  }) => {
    const fromElements = await sendWithElements(elementsPage, 'importCsv');
    const fromPlayground = await sendWithPlayground(
      playgroundPage,
      'importCsv',
      'call',
    );

    expect(fromPlayground.url).toBe(fromElements.url);
    expect(fromElements.headers['content-type']).toBe('text/*');
    expect(fromPlayground.headers['content-type']).toBeUndefined();
    expect(fromPlayground.body).toBeNull();
  });
});
