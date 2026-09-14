import { RouterProvider as AriaRouterProvider } from 'react-aria-components';
import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TenantInvocation } from './TenantInvocation';

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

const hooks = vi.hoisted(() => ({ journal: vi.fn(), purge: vi.fn() }));
vi.mock('@restate/data-access/admin-api-hooks', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/data-access/admin-api-hooks')
  >()),
  useGetInvocationJournalWithInvocationV2: hooks.journal,
  usePurgeInvocation: () => ({ mutate: hooks.purge, reset: vi.fn() }),
  useGetPausedError: () => ({}),
  useGetTransientError: () => ({}),
}));
vi.mock('@restate/features/invocation-route', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/features/invocation-route')
  >()),
  JournalV2: ({ invocationId }: { invocationId: string }) => (
    <div data-testid="journal">{invocationId}</div>
  ),
}));

const originalGetAnimations = Element.prototype.getAnimations;
const originalScrollTo = Element.prototype.scrollTo;
const originalScrollBy = Element.prototype.scrollBy;
beforeEach(() => {
  Element.prototype.getAnimations = () => [];
  Element.prototype.scrollTo = vi.fn();
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
  Element.prototype.scrollTo = originalScrollTo;
  Element.prototype.scrollBy = originalScrollBy;
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('TenantInvocation', () => {
  it('renders the shared journal and preserves list filters and supports invocation actions', async () => {
    const user = userEvent.setup();
    hooks.journal.mockReturnValue({
      data: {
        id: 'inv-acme',
        scope: 'acme',
        target: 'Greeter/run',
        target_service_name: 'Greeter',
        target_handler_name: 'run',
        target_service_ty: 'service',
        status: 'succeeded',
        completion_result: 'success',
        created_at: '2026-09-14T08:00:00Z',
        modified_at: '2026-09-14T08:00:02Z',
        completed_at: '2026-09-14T08:00:02Z',
        vqueue: {
          vqueue_id: 'vq-acme',
          stage: 'finished',
          status: 'succeeded',
          created_at: '2026-09-14T08:00:00Z',
          first_runnable_at: '2026-09-14T08:00:00Z',
          first_attempt_at: '2026-09-14T08:00:01Z',
          num_attempts: 1,
        },
      },
      dataUpdatedAt: Date.now(),
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
                    <TenantInvocation scope="acme" invocationId="inv-acme" />
                  </AriaRouter>
                ),
              },
            ],
            {
              initialEntries: [
                '/tenants/acme/invocations/inv-acme?service=Greeter&status=running&detail=all&q=ignored',
              ],
            },
          )}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('heading', { name: 'Lifecycle' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeTruthy();
    expect(screen.getByTestId('journal').textContent).toBe('inv-acme');
    expect(
      screen.getByRole('link', { name: 'Invocations' }).getAttribute('href'),
    ).toBe('/tenants/acme/invocations?service=Greeter&status=running');
    await user.click(screen.getByRole('link', { name: /Purge/ }));
    expect(
      await screen.findByRole('heading', { name: 'Purge Invocation' }),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Purge' }));
    expect(hooks.purge).toHaveBeenCalledWith({
      parameters: { path: { invocation_id: 'inv-acme' } },
    });
    expect(screen.queryByRole('link', { name: /Open.*handler/ })).toBeNull();
    expect(screen.queryByText('SCOPE')).toBeNull();
  });

  it('does not mount the journal when the invocation lookup fails', () => {
    hooks.journal.mockReturnValue({
      error: new Error('Invocation not found.'),
      dataUpdatedAt: 0,
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider
          router={createMemoryRouter([
            {
              path: '*',
              element: (
                <AriaRouter>
                  <TenantInvocation scope="acme" invocationId="inv-other" />
                </AriaRouter>
              ),
            },
          ])}
        />
      </QueryClientProvider>,
    );
    expect(screen.queryByTestId('journal')).toBeNull();
    expect(screen.getByText('Invocation not found.')).toBeTruthy();
  });
});
