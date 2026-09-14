import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Invocation } from '@restate/data-access/admin-api-spec';
import { TenantInvocations } from './TenantInvocations';

vi.mock('@restate/features/restate-context', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/features/restate-context')
  >()),
  useRestateContext: () => ({ baseUrl: '/tenant-view/acme' }),
}));

const hooks = vi.hoisted(() => ({ list: vi.fn(), summary: vi.fn() }));
vi.mock('@restate/data-access/admin-api-hooks', () => ({
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
beforeEach(() => {
  Element.prototype.getAnimations = () => [];
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
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('TenantInvocations', () => {
  it('keeps filters and invocation links in the tenant route without administrative controls', async () => {
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
                element: <TenantInvocations scope="acme" />,
              },
            ],
            {
              initialEntries: [
                '/tenant-view/acme/invocations?service=Greeter&status=running',
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
    ).toBe('/tenant-view/acme/invocations/inv-acme?service=Greeter');
    expect(screen.queryByRole('button', { name: 'Actions' })).toBeNull();
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
  });
});
