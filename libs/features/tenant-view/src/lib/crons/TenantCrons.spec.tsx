import { RouterProvider as AriaRouterProvider } from 'react-aria-components';
import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CronProject } from './cronApi';
import { MUX_TOKEN_STORAGE_KEY, setMuxToken } from './cronApi';
import { TenantCrons } from './TenantCrons';

function AriaRouter({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  return (
    <AriaRouterProvider navigate={navigate}>{children}</AriaRouterProvider>
  );
}

vi.mock('@restate/features-restate-context', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/features-restate-context')
  >()),
  useRestateContext: () => ({
    baseUrl: '/tenants/acme',
    ingressMuxUrl: 'http://mux.test/',
  }),
}));

const hooks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('@restate/data-access-admin-api-hooks', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/data-access-admin-api-hooks')
  >()),
  useListInvocationsV2: hooks.list,
  useGetVirtualObjectLock: () => ({ data: undefined }),
  useGetPausedError: () => ({}),
  useGetTransientError: () => ({}),
}));

const project: CronProject = {
  timer: { invocationId: 'inv_timer', wakeUpAt: Date.now() + 60_000 },
  schedules: [
    {
      id: 'sched-1',
      target: { service: 'checkout', handler: 'run' },
      payload: { cart: 'c1' },
      cron: {
        expression: '*/5 * * * *',
        normalized: '0 */5 * * * *',
        timezone: 'UTC',
      },
      createdAt: Date.now() - 3_600_000,
      updatedAt: Date.now() - 120_000,
      nextRunAt: Date.now() + 60_000,
      lastRuns: [
        { runId: 'run-1', invocationId: 'inv_run1', at: Date.now() - 60_000 },
      ],
    },
  ],
};

type Requests = { url: string; init?: RequestInit }[];

type Handler = 'list' | 'create' | 'update' | 'delete';

function mockMux(handlers: Partial<Record<Handler, () => Response>>) {
  const requests: Requests = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    requests.push({ url, init });
    const handler = url.split('/').at(-1) as Handler;
    return handlers[handler]?.() ?? Response.json(project);
  });
  return requests;
}

beforeEach(() => {
  setMuxToken(undefined);
  Element.prototype.getAnimations = () => [];
  Element.prototype.scrollTo = vi.fn();
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1600);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(900);
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(1600);
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(44);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
  vi.stubGlobal('CSS', { ...globalThis.CSS, escape: (value: string) => value });
  hooks.list.mockReturnValue({
    data: {
      rows: [{ id: 'inv_run1', status: 'succeeded', scope: 'acme' }],
      limit: 50,
    },
    isPending: false,
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

function renderCrons() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider
        router={createMemoryRouter(
          [
            {
              path: '*',
              element: (
                <AriaRouter>
                  <TenantCrons scope="acme" />
                </AriaRouter>
              ),
            },
          ],
          { initialEntries: ['/tenants/acme/crons'] },
        )}
      />
    </QueryClientProvider>,
  );
}

async function saveToken(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    await screen.findByLabelText('Operator token'),
    'operator-secret',
  );
  await user.click(screen.getByRole('button', { name: 'Save' }));
}

describe('TenantCrons', () => {
  it('asks for the operator token, then lists the cron through the mux', async () => {
    const user = userEvent.setup();
    const requests = mockMux({});
    renderCrons();

    expect(requests).toHaveLength(0);
    await saveToken(user);

    expect(await screen.findByText('*/5 * * * *')).toBeTruthy();
    expect(localStorage.getItem(MUX_TOKEN_STORAGE_KEY)).toBe('operator-secret');
    expect(requests[0]?.url).toBe(
      'http://mux.test/restate/scope/acme/call/cron/default/list',
    );
    expect(requests[0]?.init).toMatchObject({
      method: 'POST',
      headers: { authorization: 'Bearer operator-secret' },
    });
    expect(
      screen
        .getByRole('link', { name: 'Open run inv_run1' })
        .getAttribute('href'),
    ).toBe('/tenants/acme/invocations/inv_run1');
    expect(screen.getByText('Succeeded')).toBeTruthy();
    expect(screen.getByText('Next wake-up')).toBeTruthy();
    expect(hooks.list.mock.lastCall?.[0].filters).toEqual([
      { field: 'scope', type: 'STRING', operation: 'EQUALS', value: 'acme' },
      {
        field: 'id',
        type: 'STRING_LIST',
        operation: 'IN',
        value: ['inv_run1'],
      },
    ]);
  }, 20_000);

  it('marks runs whose status can’t be read as unknown', async () => {
    setMuxToken('operator-secret');
    hooks.list.mockReturnValue({
      data: undefined,
      isPending: false,
      error: new Error('non valid invocation id'),
    });
    mockMux({});
    renderCrons();

    expect(await screen.findByText('Unknown')).toBeTruthy();
    expect(screen.queryByText('non valid invocation id')).toBeNull();
  }, 20_000);

  it('asks again when the mux rejects the token', async () => {
    setMuxToken('stale');
    mockMux({ list: () => new Response(null, { status: 401 }) });
    renderCrons();

    expect(
      await screen.findByText(/The ingress mux rejected the token/),
    ).toBeTruthy();
    expect(localStorage.getItem(MUX_TOKEN_STORAGE_KEY)).toBeNull();
  }, 20_000);

  it('shows the cron’s validation error when creating a schedule', async () => {
    const user = userEvent.setup();
    setMuxToken('operator-secret');
    const requests = mockMux({
      list: () => Response.json({ timer: null, schedules: [] }),
      create: () =>
        Response.json(
          { code: 400, message: 'cron "nope" is not a valid expression' },
          { status: 400 },
        ),
    });
    renderCrons();

    await user.click(
      (await screen.findAllByRole('button', { name: /New schedule/ }))[0]!,
    );
    await user.type(await screen.findByLabelText('Cron expression'), 'nope');
    await user.type(
      screen.getByRole('combobox', { name: 'Service' }),
      'checkout',
    );
    await user.tab();
    await user.type(screen.getByRole('combobox', { name: 'Handler' }), 'run');
    await user.tab();
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(
      await screen.findByText('cron "nope" is not a valid expression'),
    ).toBeTruthy();
    const create = requests.find(({ url }) => url.endsWith('/create'));
    expect(JSON.parse(String(create?.init?.body))).toEqual({
      cron: 'nope',
      timezone: 'UTC',
      target: { service: 'checkout', handler: 'run' },
    });
  }, 20_000);

  it('edits a schedule with its whole definition, pre-filled', async () => {
    const user = userEvent.setup();
    setMuxToken('operator-secret');
    const requests = mockMux({
      update: () => Response.json({ ...project.schedules[0] }),
    });
    renderCrons();

    expect(await screen.findByText(/^updated/)).toBeTruthy();
    await user.click(
      await screen.findByRole('button', { name: 'Edit schedule sched-1' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Edit schedule' }),
    ).toBeTruthy();
    const cron = screen.getByLabelText('Cron expression') as HTMLInputElement;
    expect(cron.value).toBe('*/5 * * * *');
    expect(
      (screen.getByRole('combobox', { name: 'Service' }) as HTMLInputElement)
        .value,
    ).toBe('checkout');
    await user.clear(cron);
    await user.type(cron, '0 * * * *');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: 'Edit schedule' }),
      ).toBeNull(),
    );
    const update = requests.find(({ url }) => url.endsWith('/update'));
    expect(update?.url).toBe(
      'http://mux.test/restate/scope/acme/call/cron/default/update',
    );
    expect(JSON.parse(String(update?.init?.body))).toEqual({
      id: 'sched-1',
      cron: '0 * * * *',
      timezone: 'UTC',
      target: { service: 'checkout', handler: 'run' },
      payload: { cart: 'c1' },
    });
    await waitFor(() =>
      expect(requests.filter(({ url }) => url.endsWith('/list')).length).toBe(
        2,
      ),
    );
  }, 20_000);

  it('shows a deleted-meanwhile schedule and refreshes the list', async () => {
    const user = userEvent.setup();
    setMuxToken('operator-secret');
    const requests = mockMux({
      update: () =>
        Response.json(
          { code: 404, message: 'schedule "sched-1" not found' },
          { status: 404 },
        ),
    });
    renderCrons();

    await user.click(
      await screen.findByRole('button', { name: 'Edit schedule sched-1' }),
    );
    await user.click(await screen.findByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('schedule "sched-1" not found'),
    ).toBeTruthy();
    await waitFor(() =>
      expect(requests.filter(({ url }) => url.endsWith('/list')).length).toBe(
        2,
      ),
    );
  }, 20_000);

  it('deletes a schedule after confirmation', async () => {
    const user = userEvent.setup();
    setMuxToken('operator-secret');
    const requests = mockMux({ delete: () => new Response(null) });
    renderCrons();

    await user.click(
      await screen.findByRole('button', { name: 'Delete schedule sched-1' }),
    );
    await user.click(await screen.findByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(
        requests.find(({ url }) => url.endsWith('/delete'))?.init?.body,
      ).toBe(JSON.stringify({ id: 'sched-1' })),
    );
  }, 20_000);
});
