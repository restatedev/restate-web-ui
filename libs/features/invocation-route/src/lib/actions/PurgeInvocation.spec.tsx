import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PurgeInvocation } from './PurgeInvocation';

vi.mock('@restate/features-restate-context', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/features-restate-context')
  >()),
  useRestateContext: () => ({ baseUrl: '/tenants/acme' }),
}));

vi.mock('@restate/data-access-admin-api-hooks', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/data-access-admin-api-hooks')
  >()),
  usePurgeInvocation: (
    _id: string,
    options?: { onSuccess?: (...args: unknown[]) => void },
  ) => ({
    mutate: (variables: unknown) =>
      options?.onSuccess?.(undefined, variables, undefined),
    reset: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
});

async function purge(initialEntry: string) {
  const router = createMemoryRouter(
    [{ path: '*', element: <PurgeInvocation.Dialog /> }],
    { initialEntries: [initialEntry] },
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  await userEvent
    .setup()
    .click(await screen.findByRole('button', { name: 'Purge' }));
  return router.state.location;
}

describe('PurgeInvocation', () => {
  it('goes to the invocations list after purging from the invocation page', async () => {
    const location = await purge(
      '/tenants/acme/invocations/inv_1?purge-invocation=inv_1',
    );

    expect(location.pathname).toBe('/tenants/acme/invocations');
    expect(location.search).toBe('?restore=1');
  });

  it('stays on the current page after purging from elsewhere', async () => {
    const location = await purge(
      '/tenants/acme/invocations?filter_status=completed&purge-invocation=inv_1',
    );

    expect(location.pathname).toBe('/tenants/acme/invocations');
    expect(location.search).toBe('?filter_status=completed');
  });
});
