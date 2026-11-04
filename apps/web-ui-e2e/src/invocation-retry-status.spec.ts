import { test, expect, type Page } from '@playwright/test';

const INVOCATION_ID = 'inv_1retrystatus0000000000000000000000';

async function mockAdminApi(page: Page) {
  const now = Date.now();
  const invocation = {
    id: INVOCATION_ID,
    target: 'Checkout/run',
    target_service_name: 'Checkout',
    target_handler_name: 'run',
    target_service_ty: 'service',
    invoked_by: 'ingress',
    pinned_deployment_id: 'dp_11111111111111111111111',
    pinned_service_protocol_version: 7,
    created_at: new Date(now - 60_000).toISOString(),
    modified_at: new Date(now - 59_000).toISOString(),
    running_at: new Date(now - 59_000).toISOString(),
    vqueue_id: 'vq_1retrystatus',
    status: 'running',
    retry_count: 1,
    journal_size: 1,
  };
  const vqueue = {
    entry_id: INVOCATION_ID,
    vqueue_id: 'vq_1retrystatus',
    stage: 'running',
    status: 'backing-off',
    created_at: new Date(now - 60_000).toISOString(),
    first_runnable_at: new Date(now - 60_000).toISOString(),
    first_attempt_at: new Date(now - 59_000).toISOString(),
    latest_attempt_at: new Date(now - 5_000).toISOString(),
    transitioned_at: new Date(now - 5_000).toISOString(),
    deployment: 'dp_11111111111111111111111',
    retry_count_since_last_stored_command: 2,
    retry_attempts: 2,
    num_attempts: 3,
    num_errors: 2,
  };
  const transientError = {
    id: INVOCATION_ID,
    after_journal_entry_index: 0,
    appended_at: new Date(now - 6_000).toISOString(),
    event_type: 'TransientError',
    event_json: JSON.stringify({
      error_message: 'card declined by issuer',
      related_command_index: 0,
    }),
  };

  await page.route('*/**/health', (route) => route.fulfill({ status: 200 }));
  await page.route('*/**/version', (route) =>
    route.fulfill({
      json: {
        version: '1.8.1',
        min_admin_api_version: 2,
        max_admin_api_version: 5,
        ingress_endpoint: 'http://localhost:8080/',
        features: {},
      },
    }),
  );
  await page.route('*/**/deployments', (route) =>
    route.fulfill({ json: { deployments: [] } }),
  );
  await page.route(/\/query(\?|$)/, async (route) => {
    const { query } = route.request().postDataJSON() as { query: string };
    let rows: Record<string, unknown>[] = [];
    if (/from sys_invocation where id/i.test(query)) {
      rows = [invocation];
    } else if (/from sys_vqueue_entry_status/i.test(query)) {
      rows = [vqueue];
    } else if (/from sys_journal_events/i.test(query)) {
      rows = [transientError];
    }
    await route.fulfill({ json: { rows } });
  });
}

test('numbers the attempt in progress after scheduler retries', async ({
  page,
}) => {
  await mockAdminApi(page);

  await page.goto(`/ui/invocations/${INVOCATION_ID}`);

  await expect(
    page.getByRole('button', { name: '3rd attempt' }).first(),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: '2nd attempt' })).toHaveCount(
    0,
  );
});
