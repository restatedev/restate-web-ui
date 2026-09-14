import { RouterProvider as AriaRouterProvider } from 'react-aria-components';
import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Invocation } from '@restate/data-access/admin-api-spec';
import { TenantInvocations } from './TenantInvocations';

function AriaRouter({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  return (
    <AriaRouterProvider navigate={navigate}>{children}</AriaRouterProvider>
  );
}

vi.mock('@restate/features/restate-context', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/features/restate-context')
  >()),
  useRestateContext: () => ({ baseUrl: '/tenants/acme' }),
}));

const hooks = vi.hoisted(() => ({
  list: vi.fn(),
  summary: vi.fn(),
  cancel: vi.fn(),
  batchCancel: vi.fn(),
  resetBatch: vi.fn(),
}));
vi.mock('@restate/data-access/admin-api-hooks', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/data-access/admin-api-hooks')
  >()),
  useCancelInvocation: () => ({ mutate: hooks.cancel, reset: vi.fn() }),
  useBatchCancelInvocations: () => ({
    mutate: hooks.batchCancel,
    reset: hooks.resetBatch,
  }),
  useListInvocationsV2: hooks.list,
  useSummaryInvocationsV2: hooks.summary,
  useGetPausedError: () => ({}),
  useGetTransientError: () => ({}),
}));

const invocation: Invocation = {
  id: 'inv-acme',
  scope: 'acme',
  target: 'Greeter/run',
  target_service_name: 'Greeter',
  target_handler_name: 'run',
  target_service_ty: 'service',
  status: 'running',
  created_at: '2026-09-14T08:00:00Z',
  modified_at: '2026-09-14T08:00:00Z',
  scheduled_at: '2026-09-14T08:00:00Z',
  invoked_by: 'ingress',
};

const originalGetAnimations = Element.prototype.getAnimations;
const originalScrollBy = Element.prototype.scrollBy;
beforeEach(() => {
  Element.prototype.getAnimations = () => [];
  Element.prototype.scrollBy = vi.fn();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
  vi.stubGlobal('CSS', { ...globalThis.CSS, escape: (value: string) => value });
});

afterEach(() => {
  cleanup();
  Element.prototype.getAnimations = originalGetAnimations;
  Element.prototype.scrollBy = originalScrollBy;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('TenantInvocations', () => {
  it('keeps filters and links scoped and supports invocation actions', async () => {
    const user = userEvent.setup();
    const refreshList = vi.fn();
    const refreshSummary = vi.fn();
    hooks.summary.mockReturnValue({ refetch: refreshSummary });
    hooks.list.mockReturnValue({
      data: { rows: [invocation], limit: 50 },
      dataUpdatedAt: Date.now(),
      refetch: refreshList,
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider
          router={createMemoryRouter(
            [
              {
                path: '*',
                element: (
                  <AriaRouter>
                    <TenantInvocations scope="acme" />
                  </AriaRouter>
                ),
              },
            ],
            {
              initialEntries: [
                '/tenants/acme/invocations?service=Greeter&status=running',
              ],
            },
          )}
        />
      </QueryClientProvider>,
    );
    expect(hooks.list.mock.lastCall?.[0]).toMatchObject({
      mode: { type: 'exact' },
      filters: [
        { field: 'scope', value: 'acme' },
        { field: 'target_service_name', value: 'Greeter' },
        { field: 'status', value: ['running'] },
      ],
    });
    expect(
      screen.getByRole('link', { name: 'inv-acme' }).getAttribute('href'),
    ).toBe('/tenants/acme/invocations/inv-acme?service=Greeter');
    expect(screen.getAllByText('Modified at').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Cancel/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Open.*handler/ })).toBeNull();
    expect(screen.queryByText('SCOPE')).toBeNull();
    expect(hooks.list.mock.lastCall?.[1]).toMatchObject({
      refetchInterval: false,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    });
    expect(hooks.summary.mock.lastCall?.[0].filters).not.toContainEqual(
      expect.objectContaining({ field: 'status' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Refresh invocations' }),
    );
    expect(refreshList).toHaveBeenCalledTimes(1);
    expect(refreshSummary).toHaveBeenCalledTimes(1);
    await user.click(
      screen.getByRole('button', { name: 'Edit Service filter' }),
    );
    const input = await screen.findByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Checkout');
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(hooks.list.mock.lastCall?.[0].filters).toContainEqual({
        field: 'target_service_name',
        type: 'STRING',
        operation: 'EQUALS',
        value: 'Checkout',
      }),
    );
    expect(hooks.list.mock.lastCall?.[0].filters).toContainEqual({
      field: 'scope',
      type: 'STRING',
      operation: 'EQUALS',
      value: 'acme',
    });
    await user.click(screen.getByRole('tab', { name: /^Completed/ }));
    expect(hooks.list.mock.lastCall?.[0].filters).toContainEqual({
      field: 'status',
      type: 'STRING_LIST',
      operation: 'IN',
      value: ['succeeded', 'failed', 'cancelled', 'killed'],
    });
    await user.click(screen.getByRole('tab', { name: /^All statuses/ }));
    expect(hooks.list.mock.lastCall?.[0].filters).not.toContainEqual(
      expect.objectContaining({ field: 'status' }),
    );
    await user.click(screen.getByRole('link', { name: /Cancel/ }));
    expect(
      await screen.findByRole('heading', { name: 'Cancel Invocation' }),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(hooks.cancel).toHaveBeenCalledWith({
      parameters: { path: { invocation_id: 'inv-acme' } },
    });
  });
  it.each([
    [false, true],
    [true, true],
    [false, false],
  ])(
    'confirms batch actions for selected=%s filtered=%s with the correct targets',
    async (selectRows, filtered) => {
      const user = userEvent.setup();
      hooks.summary.mockReturnValue({
        data: { total: 2, stageBuckets: [], statusBuckets: [] },
        refetch: vi.fn(),
      });
      hooks.list.mockReturnValue({
        data: {
          rows: [invocation, { ...invocation, id: 'inv-acme-2' }],
          limit: 50,
        },
        dataUpdatedAt: Date.now(),
        refetch: vi.fn(),
      });
      render(
        <QueryClientProvider client={new QueryClient()}>
          <RouterProvider
            router={createMemoryRouter(
              [
                {
                  path: '*',
                  element: (
                    <AriaRouter>
                      <TenantInvocations scope="acme" />
                    </AriaRouter>
                  ),
                },
              ],
              {
                initialEntries: [
                  `/tenants/acme/invocations${filtered ? '?service=Greeter&status=running' : ''}`,
                ],
              },
            )}
          />
        </QueryClientProvider>,
      );
      if (selectRows) {
        const grid = screen.getByRole('grid', { name: 'Tenant invocations' });
        const checkboxes = within(grid).getAllByRole('checkbox');
        const lastCheckbox = checkboxes.at(-1);
        if (!lastCheckbox) throw new Error('Missing row selection checkbox');
        await user.click(lastCheckbox);
      }
      await user.click(screen.getByRole('button', { name: /^Actions/ }));
      await user.click(await screen.findByRole('menuitem', { name: /Cancel/ }));
      expect(
        await screen.findByRole('heading', { name: 'Cancel Invocations' }),
      ).toBeTruthy();
      const dialog = within(screen.getByRole('dialog'));
      expect(dialog.queryByText('scope')).toBeNull();
      expect(dialog.queryByText('acme')).toBeNull();
      expect(dialog.queryByText('target_service_name')).toBeNull();
      expect(dialog.queryByText('[]')).toBeNull();
      if (!selectRows) {
        expect(dialog.getByText('Service')).toBeTruthy();
        expect(dialog.getByText('Status')).toBeTruthy();
        if (filtered) {
          expect(dialog.getByText('Greeter')).toBeTruthy();
          expect(dialog.getByText('Running')).toBeTruthy();
        } else {
          expect(dialog.getAllByText('Any')).toHaveLength(2);
        }
      }
      expect(hooks.batchCancel).not.toHaveBeenCalled();
      await user.click(screen.getByRole('button', { name: 'Confirm' }));
      const request = hooks.batchCancel.mock.lastCall?.[0];
      if (selectRows) {
        expect(request.body).toEqual({ invocationIds: ['inv-acme-2'] });
      } else {
        expect(request.body.filters).toEqual(
          expect.arrayContaining([
            {
              field: 'scope',
              type: 'STRING',
              operation: 'EQUALS',
              value: 'acme',
            },
            ...(filtered
              ? [
                  {
                    field: 'target_service_name',
                    type: 'STRING',
                    operation: 'EQUALS',
                    value: 'Greeter',
                  },
                  {
                    field: 'status',
                    type: 'STRING_LIST',
                    operation: 'IN',
                    value: ['running'],
                  },
                ]
              : []),
          ]),
        );
      }
    },
  );
});
