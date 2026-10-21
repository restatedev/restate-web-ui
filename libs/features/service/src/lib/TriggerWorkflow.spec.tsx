import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PropsWithChildren } from 'react';
import { RouterProvider as AriaRouterProvider } from 'react-aria-components';
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router';
import {
  TRIGGER_WORKFLOW_QUERY,
  TriggerWorkflowDialog,
} from './TriggerWorkflow';

vi.mock('@restate/features-restate-context', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/features-restate-context')
  >()),
  useRestateContext: () => ({
    baseUrl: '/tenants/acme',
    ingressMuxUrl: 'http://mux.test',
  }),
}));

vi.mock('@restate/data-access-admin-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@restate/data-access-admin-api')>()),
  useSchemaRegistry: () => ({ scope: 'acme' }),
}));

vi.mock('@restate/data-access-admin-api-hooks', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/data-access-admin-api-hooks')
  >()),
  useServiceDetails: () => ({
    isPending: false,
    data: {
      name: 'onboarding',
      handlers: [
        {
          name: 'run',
          input_json_schema: {
            type: 'object',
            properties: { userId: { type: 'string' } },
          },
        },
      ],
    },
  }),
}));

function AriaRouter({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  return (
    <AriaRouterProvider navigate={navigate}>{children}</AriaRouterProvider>
  );
}

function renderDialog() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider
        router={createMemoryRouter(
          [
            {
              path: '*',
              element: (
                <AriaRouter>
                  <TriggerWorkflowDialog />
                </AriaRouter>
              ),
            },
          ],
          {
            initialEntries: [
              `/tenants/acme/overview?${TRIGGER_WORKFLOW_QUERY}=onboarding`,
            ],
          },
        )}
      />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('TriggerWorkflowDialog', () => {
  it('sends a run as the tenant with the run ID and links to it', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        Response.json(
          { invocationId: 'inv_1run', status: 'Accepted' },
          { status: 202 },
        ),
      );
    renderDialog();

    const runId = (await screen.findByLabelText('Run ID')) as HTMLInputElement;
    expect(runId.value).toMatch(/^[0-9a-f-]{36}$/);
    await user.clear(runId);
    await user.type(runId, 'run-42');
    await user.click(screen.getByRole('button', { name: 'Trigger' }));

    expect(await screen.findByText('Run started.')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'inv_1run' }).getAttribute('href'),
    ).toBe('/tenants/acme/invocations/inv_1run');
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe('http://mux.test/restate/send/onboarding/run');
    expect(init).toMatchObject({
      method: 'POST',
      headers: {
        'x-restate-tenant': 'acme',
        'idempotency-key': 'run-42',
        'content-type': 'application/json',
      },
    });
    expect(JSON.parse(String(init?.body))).toEqual({ userId: '' });
  }, 20_000);

  it('says when a run with the same ID already exists', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ invocationId: 'inv_1run', status: 'PreviouslyAccepted' }),
    );
    renderDialog();

    await user.click(await screen.findByRole('button', { name: 'Trigger' }));

    expect(
      await screen.findByText('A run with this ID already exists.'),
    ).toBeTruthy();
  }, 20_000);
});
